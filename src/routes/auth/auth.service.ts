import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { RolesService } from './roles.service'
import { HashingService } from '@/shared/services/hashing.service'

import {
  ForgotPasswordBodyDTO,
  LoginBodyDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RegisterBodyDTO,
  ResendVerificationCodeBodyDTO,
  ResetPasswordBodyDTO,
  VerifyEmailBodyDTO,
  VerifyTwoFactorLoginBodyDTO,
  VerifyTwoFactorRecoveryBodyDTO,
} from './auth.dto'
import { UserRepository } from '../user/user.repository'
import { DeviceRepository } from '../device/device.repository'
import { TokenService } from '@/shared/services/token.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'
import { PrismaService } from '@/shared/services/prisma.service'

import { ensureUserIsActive } from '@/shared/helpers/user-status.helper'
import { VerificationCodeRepository } from '../verification-code/verification-code.repository'
import { UserStatus, VerificationCodeType } from '../../../generated/prisma/enums'
import { randomInt, randomUUID } from 'crypto'
import { EmailService } from '@/shared/services/email.service'
import { MESSAGE } from '@/shared/constants/message.constant'
import { TwoFactorService } from './two-factor.service'
import { RecoveryCodeRepository } from '../recovery-code/recovery-code.repository'
import { RedisService } from '@/shared/services/redis.service'

type LoginDeviceInfo = {
  userAgent: string
  ip: string
}

@Injectable()
export class AuthService {
  private getTwoFactorChallengeKey(challengeId: string) {
    return `2fa:challengeId:${challengeId}`
  }
  private async createLoginSession(user: Awaited<ReturnType<UserRepository['findById']>>, deviceInfo: LoginDeviceInfo) {
    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }
    const device = await this.deviceRepository.create({
      userId: user.id,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
    })

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId: user.id }),
      this.tokenService.signRefreshToken({ userId: user.id }),
    ])

    const refreshTokenPayload = await this.tokenService.verifyRefreshToken(refreshToken)

    const expiresAt = new Date(refreshTokenPayload.exp * 1000)

    await this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      deviceId: device.id,
      expiresAt,
    })

    return {
      requiresTwoFactor: false,
      user,
      accessToken,
      refreshToken,
    }
  }
  constructor(
    private readonly rolesService: RolesService,
    private readonly hashingService: HashingService,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly prismaService: PrismaService,
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly emailService: EmailService,
    private readonly twoFactorService: TwoFactorService,
    private readonly recoveryCodeRepository: RecoveryCodeRepository,
    private readonly redisService: RedisService,
  ) {}
  async register(body: RegisterBodyDTO) {
    const clientRoleId = await this.rolesService.getClientRoleId()
    const hashedPassword = await this.hashingService.hash(body.password)

    const existingUser = await this.userRepository.findByEmail(body.email)

    if (existingUser) {
      if (existingUser.status === UserStatus.INACTIVE) {
        throw new ConflictException(MESSAGE.AUTH.ACCOUNT_ALREADY_EXISTS_UNVERIFIED)
      }

      throw new ConflictException(MESSAGE.AUTH.EMAIL_ALREADY_REGISTERED)
    }

    const existingPhoneNumber = await this.userRepository.findByPhoneNumber(body.phoneNumber)
    if (existingPhoneNumber) {
      throw new ConflictException(MESSAGE.AUTH.PHONE_ALREADY_REGISTERED)
    }

    const user = await this.userRepository.create({
      email: body.email,
      password: hashedPassword,
      name: body.name,
      phoneNumber: body.phoneNumber,
      roleId: clientRoleId,
    })

    const verificationCode = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.verificationCodeRepository.upsert(user.email, VerificationCodeType.REGISTER, verificationCode, expiresAt)

    await this.emailService.sendVerificationCode(user.email, verificationCode)
    return user
  }

  async login(body: LoginBodyDTO, deviceInfo: LoginDeviceInfo) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.EMAIL_OR_PASSWORD_INCORRECT)
    }

    const isPasswordCorrect = await this.hashingService.compare(body.password, user.password)

    if (!isPasswordCorrect) {
      throw new UnauthorizedException(MESSAGE.AUTH.EMAIL_OR_PASSWORD_INCORRECT)
    }

    ensureUserIsActive(user.status)

    if (user.totpEnabled) {
      const challengeId = randomUUID()
      const redis = this.redisService.getClient()
      await redis.set(this.getTwoFactorChallengeKey(challengeId), user.id.toString(), {
        EX: 300,
        NX: true,
      })
      const twoFactorToken = await this.tokenService.signTwoFactorToken({ userId: user.id, challengeId })

      return {
        requiresTwoFactor: true,
        twoFactorToken,
      }
    }

    const session = await this.createLoginSession(user, deviceInfo)

    return {
      ...session,
    }
  }

  async refreshToken(body: RefreshTokenBodyDTO) {
    const payload = await this.tokenService.verifyRefreshToken(body.refreshToken)

    const refreshToken = await this.refreshTokenRepository.findByToken(body.refreshToken)

    if (!refreshToken) {
      throw new UnauthorizedException(MESSAGE.AUTH.REFRESH_TOKEN_INVALID)
    }

    if (refreshToken.userId !== payload.userId) {
      throw new UnauthorizedException(MESSAGE.AUTH.REFRESH_TOKEN_INVALID)
    }

    const user = await this.userRepository.findById(payload.userId)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    ensureUserIsActive(user.status)

    const device = await this.deviceRepository.findById(refreshToken.deviceId)

    if (!device || !device.isActive) {
      throw new UnauthorizedException(MESSAGE.AUTH.DEVICE_INACTIVE)
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId: payload.userId }),
      this.tokenService.signRefreshToken({ userId: payload.userId }),
    ])

    const newRefreshTokenPayload = await this.tokenService.verifyRefreshToken(newRefreshToken)

    const expiresAt = new Date(newRefreshTokenPayload.exp * 1000)

    await this.prismaService.$transaction(async (tx) => {
      await this.refreshTokenRepository.deleteByToken(body.refreshToken, tx)

      await this.refreshTokenRepository.create(
        {
          token: newRefreshToken,
          userId: payload.userId,
          deviceId: device.id,
          expiresAt,
        },
        tx,
      )
    })

    return { accessToken, refreshToken: newRefreshToken }
  }

  async logout(body: LogoutBodyDTO) {
    const refreshToken = await this.refreshTokenRepository.findByToken(body.refreshToken)

    if (!refreshToken) {
      throw new UnauthorizedException(MESSAGE.AUTH.REFRESH_TOKEN_INVALID)
    }

    await this.prismaService.$transaction(async (tx) => {
      await this.refreshTokenRepository.deleteByToken(body.refreshToken, tx)

      await this.deviceRepository.updateActiveStatus(refreshToken.deviceId, false, tx)
    })

    return { message: MESSAGE.AUTH.LOGOUT_SUCCESSFUL }
  }

  async verifyEmail(body: VerifyEmailBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new UnauthorizedException(MESSAGE.AUTH.EMAIL_ALREADY_VERIFIED)
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException(MESSAGE.AUTH.ACCOUNT_BLOCKED)
    }

    const verificationCode = await this.verificationCodeRepository.findByEmailAndType(
      body.email,
      VerificationCodeType.REGISTER,
    )

    if (!verificationCode) {
      throw new UnauthorizedException(MESSAGE.AUTH.VERIFICATION_CODE_INVALID)
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException(MESSAGE.AUTH.VERIFICATION_CODE_EXPIRED)
    }

    if (verificationCode.code !== body.code) {
      throw new UnauthorizedException(MESSAGE.AUTH.VERIFICATION_CODE_INVALID)
    }

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updateStatus(user.id, UserStatus.ACTIVE, tx)
      await this.verificationCodeRepository.deleteByEmailAndType(body.email, VerificationCodeType.REGISTER, tx)
    })

    return { message: MESSAGE.AUTH.EMAIL_VERIFIED_SUCCESSFULLY }
  }

  async resendVerificationCode(body: ResendVerificationCodeBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_ALREADY_ACTIVE)
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException(MESSAGE.AUTH.ACCOUNT_BLOCKED)
    }

    const existingCode = await this.verificationCodeRepository.findByEmailAndType(
      user.email,
      VerificationCodeType.REGISTER,
    )

    if (existingCode && Date.now() - existingCode.updatedAt.getTime() < 60 * 1000) {
      throw new UnauthorizedException(MESSAGE.AUTH.RESEND_CODE_RATE_LIMIT)
    }

    const verificationCode = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.verificationCodeRepository.upsert(user.email, VerificationCodeType.REGISTER, verificationCode, expiresAt)

    await this.emailService.sendVerificationCode(user.email, verificationCode)

    return { message: MESSAGE.AUTH.VERIFICATION_CODE_RESENT_SUCCESSFULLY }
  }

  async forgotPassword(body: ForgotPasswordBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      return {
        message: MESSAGE.AUTH.RESET_CODE_SENT,
      }
    }

    ensureUserIsActive(user.status)

    const existingCode = await this.verificationCodeRepository.findByEmailAndType(
      user.email,
      VerificationCodeType.FORGOT_PASSWORD,
    )

    if (existingCode && Date.now() - existingCode.updatedAt.getTime() < 60 * 1000) {
      return {
        message: MESSAGE.AUTH.RESET_CODE_SENT,
      }
    }

    const code = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.verificationCodeRepository.upsert(user.email, VerificationCodeType.FORGOT_PASSWORD, code, expiresAt)

    await this.emailService.sendVerificationCode(user.email, code)

    return {
      message: MESSAGE.AUTH.RESET_CODE_SENT,
    }
  }

  async resetPassword(body: ResetPasswordBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.RESET_CODE_INVALID_OR_EXPIRED)
    }

    ensureUserIsActive(user.status)

    const verificationCode = await this.verificationCodeRepository.findByEmailAndType(
      body.email,
      VerificationCodeType.FORGOT_PASSWORD,
    )

    if (!verificationCode) {
      throw new UnauthorizedException(MESSAGE.AUTH.RESET_CODE_INVALID_OR_EXPIRED)
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException(MESSAGE.AUTH.RESET_CODE_INVALID_OR_EXPIRED)
    }

    if (verificationCode.code !== body.code) {
      throw new UnauthorizedException(MESSAGE.AUTH.RESET_CODE_INVALID_OR_EXPIRED)
    }

    const hashedPassword = await this.hashingService.hash(body.password)

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updatePassword(user.id, hashedPassword, tx)

      await this.verificationCodeRepository.deleteByEmailAndType(body.email, VerificationCodeType.FORGOT_PASSWORD, tx)

      await this.refreshTokenRepository.deleteAllByUserId(user.id, tx)

      await this.deviceRepository.deactivateAllByUserId(user.id, tx)
    })

    return {
      message: MESSAGE.AUTH.PASSWORD_RESET_SUCCESSFULLY,
    }
  }

  async verifyTwoFactorLogin(body: VerifyTwoFactorLoginBodyDTO, deviceInfo: LoginDeviceInfo) {
    const payload = await this.tokenService.verifyTwoFactorToken(body.twoFactorToken)

    await this.validateTwoFactorChallenge(payload.userId, payload.challengeId)

    const user = await this.userRepository.findById(payload.userId)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    ensureUserIsActive(user.status)

    if (!user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException(MESSAGE.AUTH.TWO_FACTOR_AUTHENTICATION_NOT_ENABLED)
    }

    const isValid = await this.twoFactorService.verifyCode(user.totpSecret, body.code)

    if (!isValid) {
      throw new UnauthorizedException(MESSAGE.AUTH.INVALID_TWO_FACTOR_AUTHENTICATION_CODE)
    }

    await this.consumeTwoFactorChallenge(payload.userId, payload.challengeId)
    return this.createLoginSession(user, deviceInfo)
  }

  async verifyTwoFactorRecoveryLogin(body: VerifyTwoFactorRecoveryBodyDTO, deviceInfo: LoginDeviceInfo) {
    const payload = await this.tokenService.verifyTwoFactorToken(body.twoFactorToken)

    await this.validateTwoFactorChallenge(payload.userId, payload.challengeId)

    const user = await this.userRepository.findById(payload.userId)

    if (!user) {
      throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    ensureUserIsActive(user.status)

    if (!user.totpEnabled) {
      throw new UnauthorizedException(MESSAGE.AUTH.TWO_FACTOR_AUTHENTICATION_NOT_ENABLED)
    }

    const recoveryCode = await this.twoFactorService.verifyRecoveryCode(user.id, body.recoveryCode)

    if (!recoveryCode) {
      throw new UnauthorizedException(MESSAGE.AUTH.RECOVERY_CODE_INVALID)
    }

    const result = await this.recoveryCodeRepository.consume(recoveryCode.id)

    if (result.count !== 1) {
      throw new UnauthorizedException(MESSAGE.AUTH.RECOVERY_CODE_INVALID)
    }

    await this.consumeTwoFactorChallenge(payload.userId, payload.challengeId)

    return this.createLoginSession(user, deviceInfo)
  }

  private async validateTwoFactorChallenge(userId: number, challengeId: string) {
    const redis = this.redisService.getClient()

    const value = await redis.get(this.getTwoFactorChallengeKey(challengeId))

    if (!value || Number(value) !== userId) {
      throw new UnauthorizedException(MESSAGE.AUTH.TWO_FACTOR_CHALLENGE_INVALID_OR_EXPIRED)
    }
  }

  private async consumeTwoFactorChallenge(userId: number, challengeId: string) {
    const redis = this.redisService.getClient()

    const value = await redis.getDel(this.getTwoFactorChallengeKey(challengeId))

    if (!value || Number(value) !== userId) {
      throw new UnauthorizedException(MESSAGE.AUTH.TWO_FACTOR_CHALLENGE_INVALID_OR_EXPIRED)
    }
  }
}
