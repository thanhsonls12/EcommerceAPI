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
} from './auth.dto'
import { UserRepository } from '../user/user.repository'
import { DeviceRepository } from '../device/device.repository'
import { TokenService } from '@/shared/services/token.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'
import { PrismaService } from '@/shared/services/prisma.service'

import { ensureUserIsActive } from '@/shared/helpers/user-status.helper'
import { VerificationCodeRepository } from '../verification-code/verification-code.repository'
import { UserStatus, VerificationCodeType } from '../../../generated/prisma/enums'
import { randomInt } from 'crypto'
import { EmailService } from '@/shared/services/email.service'

type LoginDeviceInfo = {
  userAgent: string
  ip: string
}

@Injectable()
export class AuthService {
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
  ) {}
  async register(body: RegisterBodyDTO) {
    const clientRoleId = await this.rolesService.getClientRoleId()
    const hashedPassword = await this.hashingService.hash(body.password)

    const existingUser = await this.userRepository.findByEmail(body.email)

    if (existingUser) {
      if (existingUser.status === UserStatus.INACTIVE) {
        throw new ConflictException('Account already exists but is not verified')
      }

      throw new ConflictException('Email is already registered')
    }

    const existingPhoneNumber = await this.userRepository.findByPhoneNumber(body.phoneNumber)
    if (existingPhoneNumber) {
      throw new ConflictException('Phone number is already registered')
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
      throw new UnauthorizedException('Email or password is incorrect')
    }

    const isPasswordCorrect = await this.hashingService.compare(body.password, user.password)

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Email or password is incorrect')
    }

    ensureUserIsActive(user.status)

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
      user,
      accessToken,
      refreshToken,
    }
  }

  async refreshToken(body: RefreshTokenBodyDTO) {
    const payload = await this.tokenService.verifyRefreshToken(body.refreshToken)

    const refreshToken = await this.refreshTokenRepository.findByToken(body.refreshToken)

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is invalid')
    }

    if (refreshToken.userId !== payload.userId) {
      throw new UnauthorizedException('Refresh token is invalid')
    }

    const user = await this.userRepository.findById(payload.userId)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    ensureUserIsActive(user.status)

    const device = await this.deviceRepository.findById(refreshToken.deviceId)

    if (!device || !device.isActive) {
      throw new UnauthorizedException('Device is inactive')
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
      throw new UnauthorizedException('Refresh token is invalid')
    }

    await this.prismaService.$transaction(async (tx) => {
      await this.refreshTokenRepository.deleteByToken(body.refreshToken, tx)

      await this.deviceRepository.updateActiveStatus(refreshToken.deviceId, false, tx)
    })

    return { message: 'Logout successful' }
  }

  async verifyEmail(body: VerifyEmailBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new UnauthorizedException('Email is already verified')
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Account is blocked')
    }

    const verificationCode = await this.verificationCodeRepository.findByEmailAndType(
      body.email,
      VerificationCodeType.REGISTER,
    )

    if (!verificationCode) {
      throw new UnauthorizedException('Verification code is invalid')
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification code has expired')
    }

    if (verificationCode.code !== body.code) {
      throw new UnauthorizedException('Verification code is invalid')
    }

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updateStatus(user.id, UserStatus.ACTIVE, tx)
      await this.verificationCodeRepository.deleteByEmailAndType(body.email, VerificationCodeType.REGISTER, tx)
    })

    return { message: 'Email verified successfully' }
  }

  async resendVerificationCode(body: ResendVerificationCodeBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is already active')
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('User is blocked')
    }

    const existingCode = await this.verificationCodeRepository.findByEmailAndType(
      user.email,
      VerificationCodeType.REGISTER,
    )

    if (existingCode && Date.now() - existingCode.updatedAt.getTime() < 60 * 1000) {
      throw new UnauthorizedException('You can only request a new code once per minute')
    }

    const verificationCode = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.verificationCodeRepository.upsert(user.email, VerificationCodeType.REGISTER, verificationCode, expiresAt)

    await this.emailService.sendVerificationCode(user.email, verificationCode)

    return { message: 'Verification code resent successfully' }
  }

  async forgotPassword(body: ForgotPasswordBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      return {
        message: 'If the email exists, a reset code has been sent',
      }
    }

    ensureUserIsActive(user.status)

    const existingCode = await this.verificationCodeRepository.findByEmailAndType(
      user.email,
      VerificationCodeType.FORGOT_PASSWORD,
    )

    if (existingCode && Date.now() - existingCode.updatedAt.getTime() < 60 * 1000) {
      return {
        message: 'If the email exists, a reset code has been sent',
      }
    }

    const code = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.verificationCodeRepository.upsert(user.email, VerificationCodeType.FORGOT_PASSWORD, code, expiresAt)

    await this.emailService.sendVerificationCode(user.email, code)

    return {
      message: 'If the email exists, a reset code has been sent',
    }
  }

  async resetPassword(body: ResetPasswordBodyDTO) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException('Reset code is invalid or expired')
    }

    ensureUserIsActive(user.status)

    const verificationCode = await this.verificationCodeRepository.findByEmailAndType(
      body.email,
      VerificationCodeType.FORGOT_PASSWORD,
    )

    if (!verificationCode) {
      throw new UnauthorizedException('Reset code is invalid or expired')
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset code is invalid or expired')
    }

    if (verificationCode.code !== body.code) {
      throw new UnauthorizedException('Reset code is invalid or expired')
    }

    const hashedPassword = await this.hashingService.hash(body.password)

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updatePassword(user.id, hashedPassword, tx)

      await this.verificationCodeRepository.deleteByEmailAndType(body.email, VerificationCodeType.FORGOT_PASSWORD, tx)

      await this.refreshTokenRepository.deleteAllByUserId(user.id, tx)

      await this.deviceRepository.deactivateAllByUserId(user.id, tx)
    })

    return {
      message: 'Password reset successfully',
    }
  }
}
