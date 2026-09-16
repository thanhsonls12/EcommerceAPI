jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}))

import { Test } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { RolesService } from './roles.service'
import { HashingService } from '@/shared/services/hashing.service'
import { UserRepository } from '../user/user.repository'
import { DeviceRepository } from '../device/device.repository'
import { TokenService } from '@/shared/services/token.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'
import { PrismaService } from '@/shared/services/prisma.service'
import { VerificationCodeRepository } from '../verification-code/verification-code.repository'
import { EmailService } from '@/shared/services/email.service'
import { TwoFactorService } from './two-factor.service'
import { RecoveryCodeRepository } from '../recovery-code/recovery-code.repository'
import { RedisService } from '@/shared/services/redis.service'
import { Prisma, UserStatus, VerificationCodeType } from '../../../generated/prisma/client'
import { hashToken } from '@/shared/helpers/token.helper'

describe('AuthService', () => {
  let service: AuthService

  const rolesService = {
    getClientRoleId: jest.fn(),
  }

  const hashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  }

  const userRepository = {
    findByEmail: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updatePassword: jest.fn(),
  }

  const deviceRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    updateActiveStatus: jest.fn(),
    deactivateAllByUserId: jest.fn(),
  }

  const tokenService = {
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    signTwoFactorToken: jest.fn(),
    verifyTwoFactorToken: jest.fn(),
  }

  const refreshTokenRepository = {
    create: jest.fn(),
    findByToken: jest.fn(),
    deleteByToken: jest.fn(),
    consumeByToken: jest.fn(),
    deleteAllByUserId: jest.fn(),
  }

  const verificationCodeRepository = {
    upsert: jest.fn(),
    findByEmailAndType: jest.fn(),
    deleteByEmailAndType: jest.fn(),
  }

  const emailService = {
    sendVerificationCode: jest.fn(),
  }

  const twoFactorService = {
    verifyCode: jest.fn(),
    verifyRecoveryCode: jest.fn(),
  }

  const recoveryCodeRepository = {
    consume: jest.fn(),
  }

  const redisClient = {
    get: jest.fn(),
    getDel: jest.fn(),
    set: jest.fn(),
  }

  const redisService = {
    getClient: jest.fn(() => redisClient),
  }

  const tx = {} as Prisma.TransactionClient

  const prismaService = {
    $transaction: jest.fn((callback: (transaction: Prisma.TransactionClient) => unknown) => callback(tx)),
  }

  const deviceInfo = {
    userAgent: 'jest',
    ip: '127.0.0.1',
  }

  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    phoneNumber: '0912345678',
    avatar: null,
    status: UserStatus.ACTIVE,
    roleId: 2,
    totpSecret: null,
    totpEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: null,
    updatedById: null,
    deletedAt: null,
    ...overrides,
  })

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RolesService, useValue: rolesService },
        { provide: HashingService, useValue: hashingService },
        { provide: UserRepository, useValue: userRepository },
        { provide: DeviceRepository, useValue: deviceRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: PrismaService, useValue: prismaService },
        { provide: VerificationCodeRepository, useValue: verificationCodeRepository },
        { provide: EmailService, useValue: emailService },
        { provide: TwoFactorService, useValue: twoFactorService },
        { provide: RecoveryCodeRepository, useValue: recoveryCodeRepository },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile()

    service = moduleRef.get(AuthService)

    jest.clearAllMocks()
    redisService.getClient.mockReturnValue(redisClient)
    prismaService.$transaction.mockImplementation((callback) => callback(tx))
    refreshTokenRepository.consumeByToken.mockResolvedValue({ count: 1 })
  })

  describe('register', () => {
    const body = {
      email: 'test@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
      name: 'Test User',
      phoneNumber: '0912345678',
    }

    it('registers a user and sends a verification code', async () => {
      const user = buildUser({ status: UserStatus.INACTIVE })

      rolesService.getClientRoleId.mockResolvedValue(2)
      hashingService.hash.mockResolvedValue('hashed-password')
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.findByPhoneNumber.mockResolvedValue(null)
      userRepository.create.mockResolvedValue(user)

      const result = await service.register(body)

      expect(rolesService.getClientRoleId).toHaveBeenCalled()
      expect(hashingService.hash).toHaveBeenCalledWith('secret123')
      expect(userRepository.create).toHaveBeenCalledWith({
        email: body.email,
        password: 'hashed-password',
        name: body.name,
        phoneNumber: body.phoneNumber,
        roleId: 2,
      })

      expect(verificationCodeRepository.upsert).toHaveBeenCalledWith(
        body.email,
        VerificationCodeType.REGISTER,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      )

      const verificationCode = verificationCodeRepository.upsert.mock.calls[0][2] as string
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(body.email, verificationCode)
      expect(result).toEqual(user)
    })

    it('rejects an existing inactive account', async () => {
      rolesService.getClientRoleId.mockResolvedValue(2)
      hashingService.hash.mockResolvedValue('hashed-password')
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))

      await expect(service.register(body)).rejects.toThrow('Account already exists but is not verified')

      expect(userRepository.findByPhoneNumber).not.toHaveBeenCalled()
      expect(userRepository.create).not.toHaveBeenCalled()
    })

    it('rejects an already registered email', async () => {
      rolesService.getClientRoleId.mockResolvedValue(2)
      hashingService.hash.mockResolvedValue('hashed-password')
      userRepository.findByEmail.mockResolvedValue(buildUser())

      await expect(service.register(body)).rejects.toThrow('Email is already registered')

      expect(userRepository.create).not.toHaveBeenCalled()
    })

    it('rejects an already registered phone number', async () => {
      rolesService.getClientRoleId.mockResolvedValue(2)
      hashingService.hash.mockResolvedValue('hashed-password')
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.findByPhoneNumber.mockResolvedValue(buildUser())

      await expect(service.register(body)).rejects.toThrow('Phone number is already registered')

      expect(userRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    const body = {
      email: 'test@example.com',
      password: 'secret123',
    }

    it('logs in and creates a session', async () => {
      const user = buildUser()
      const refreshTokenExpiresAt = 2_000_000_000

      userRepository.findByEmail.mockResolvedValue(user)
      hashingService.compare.mockResolvedValue(true)
      deviceRepository.create.mockResolvedValue({
        id: 10,
        userId: user.id,
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      tokenService.signAccessToken.mockResolvedValue('access-token')
      tokenService.signRefreshToken.mockResolvedValue('refresh-token')
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: user.id,
        type: 'refresh',
        iat: 1,
        exp: refreshTokenExpiresAt,
      })
      refreshTokenRepository.create.mockResolvedValue({
        id: 20,
        token: 'refresh-token',
        userId: user.id,
        deviceId: 10,
        expiresAt: new Date(refreshTokenExpiresAt * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.login(body, deviceInfo)

      expect(hashingService.compare).toHaveBeenCalledWith(body.password, user.password)
      expect(deviceRepository.create).toHaveBeenCalledWith({
        userId: user.id,
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip,
      })
      expect(tokenService.signAccessToken).toHaveBeenCalledWith({ userId: user.id })
      expect(tokenService.signRefreshToken).toHaveBeenCalledWith({ userId: user.id })
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        token: hashToken('refresh-token'),
        userId: user.id,
        deviceId: 10,
        expiresAt: new Date(refreshTokenExpiresAt * 1000),
      })
      expect(result).toEqual({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    })

    it('rejects login when the user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      await expect(service.login(body, deviceInfo)).rejects.toThrow('Email or password is incorrect')

      expect(hashingService.compare).not.toHaveBeenCalled()
      expect(deviceRepository.create).not.toHaveBeenCalled()
    })

    it('rejects login when the password is incorrect', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())
      hashingService.compare.mockResolvedValue(false)

      await expect(service.login(body, deviceInfo)).rejects.toThrow('Email or password is incorrect')

      expect(deviceRepository.create).not.toHaveBeenCalled()
    })

    it('rejects login for an inactive account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))
      hashingService.compare.mockResolvedValue(true)

      await expect(service.login(body, deviceInfo)).rejects.toThrow('Account is inactive')

      expect(deviceRepository.create).not.toHaveBeenCalled()
    })

    it('rejects login for a blocked account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }))
      hashingService.compare.mockResolvedValue(true)

      await expect(service.login(body, deviceInfo)).rejects.toThrow('Account is blocked')

      expect(deviceRepository.create).not.toHaveBeenCalled()
    })

    it('starts a two-factor challenge instead of creating a session', async () => {
      const user = buildUser({
        totpEnabled: true,
        totpSecret: 'SECRET',
      })

      userRepository.findByEmail.mockResolvedValue(user)
      hashingService.compare.mockResolvedValue(true)
      redisClient.set.mockResolvedValue('OK')
      tokenService.signTwoFactorToken.mockResolvedValue('two-factor-token')

      const result = await service.login(body, deviceInfo)

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringMatching(/^2fa:challengeId:/),
        user.id.toString(),
        {
          EX: 300,
          NX: true,
        },
      )

      expect(tokenService.signTwoFactorToken).toHaveBeenCalledWith({
        userId: user.id,
        challengeId: expect.any(String),
      })

      expect(deviceRepository.create).not.toHaveBeenCalled()
      expect(tokenService.signAccessToken).not.toHaveBeenCalled()
      expect(tokenService.signRefreshToken).not.toHaveBeenCalled()
      expect(refreshTokenRepository.create).not.toHaveBeenCalled()

      expect(result).toEqual({
        requiresTwoFactor: true,
        twoFactorToken: 'two-factor-token',
      })
    })
  })

  describe('refreshToken', () => {
    const body = {
      refreshToken: 'old-refresh-token',
    }

    it('rotates the refresh token and returns a new token pair', async () => {
      const user = buildUser()
      const newRefreshTokenExpiresAt = 2_100_000_000

      tokenService.verifyRefreshToken
        .mockResolvedValueOnce({
          userId: user.id,
          type: 'refresh',
          iat: 1,
          exp: 2_000_000_000,
        })
        .mockResolvedValueOnce({
          userId: user.id,
          type: 'refresh',
          iat: 2,
          exp: newRefreshTokenExpiresAt,
        })

      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: user.id,
        deviceId: 20,
        expiresAt: new Date(2_000_000_000 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      userRepository.findById.mockResolvedValue(user)
      deviceRepository.findById.mockResolvedValue({
        id: 20,
        userId: user.id,
        userAgent: 'jest',
        ip: '127.0.0.1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      tokenService.signAccessToken.mockResolvedValue('new-access-token')
      tokenService.signRefreshToken.mockResolvedValue('new-refresh-token')

      const result = await service.refreshToken(body)

      expect(tokenService.verifyRefreshToken).toHaveBeenNthCalledWith(1, body.refreshToken)
      expect(tokenService.signAccessToken).toHaveBeenCalledWith({ userId: user.id })
      expect(tokenService.signRefreshToken).toHaveBeenCalledWith({ userId: user.id })
      expect(tokenService.verifyRefreshToken).toHaveBeenNthCalledWith(2, 'new-refresh-token')

      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(hashToken(body.refreshToken))
      expect(refreshTokenRepository.consumeByToken).toHaveBeenCalledWith(hashToken(body.refreshToken), tx)
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        {
          token: hashToken('new-refresh-token'),
          userId: user.id,
          deviceId: 20,
          expiresAt: new Date(newRefreshTokenExpiresAt * 1000),
        },
        tx,
      )

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      })
    })

    it('rejects when the refresh token was consumed concurrently', async () => {
      const user = buildUser()

      tokenService.verifyRefreshToken
        .mockResolvedValueOnce({
          userId: user.id,
          type: 'refresh',
          iat: 1,
          exp: 2_000_000_000,
        })
        .mockResolvedValueOnce({
          userId: user.id,
          type: 'refresh',
          iat: 2,
          exp: 2_100_000_000,
        })

      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: hashToken(body.refreshToken),
        userId: user.id,
        deviceId: 20,
        expiresAt: new Date(2_000_000_000 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      userRepository.findById.mockResolvedValue(user)
      deviceRepository.findById.mockResolvedValue({
        id: 20,
        userId: user.id,
        userAgent: 'jest',
        ip: '127.0.0.1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      tokenService.signAccessToken.mockResolvedValue('new-access-token')
      tokenService.signRefreshToken.mockResolvedValue('new-refresh-token')
      refreshTokenRepository.consumeByToken.mockResolvedValue({ count: 0 })

      await expect(service.refreshToken(body)).rejects.toThrow('Refresh token is invalid')

      expect(refreshTokenRepository.create).not.toHaveBeenCalled()
    })

    it('rejects when the refresh token is not stored', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue(null)

      await expect(service.refreshToken(body)).rejects.toThrow('Refresh token is invalid')

      expect(userRepository.findById).not.toHaveBeenCalled()
      expect(tokenService.signAccessToken).not.toHaveBeenCalled()
    })

    it('rejects when the token owner does not match the JWT payload', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 2,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(service.refreshToken(body)).rejects.toThrow('Refresh token is invalid')

      expect(userRepository.findById).not.toHaveBeenCalled()
    })

    it('rejects when the token user no longer exists', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      userRepository.findById.mockResolvedValue(null)

      await expect(service.refreshToken(body)).rejects.toThrow('User not found')

      expect(deviceRepository.findById).not.toHaveBeenCalled()
    })

    it('rejects refresh for an inactive user', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      userRepository.findById.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))

      await expect(service.refreshToken(body)).rejects.toThrow('Account is inactive')

      expect(deviceRepository.findById).not.toHaveBeenCalled()
    })

    it('rejects when the device does not exist', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      userRepository.findById.mockResolvedValue(buildUser())
      deviceRepository.findById.mockResolvedValue(null)

      await expect(service.refreshToken(body)).rejects.toThrow('Device is inactive')

      expect(tokenService.signAccessToken).not.toHaveBeenCalled()
    })

    it('rejects when the device is inactive', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      userRepository.findById.mockResolvedValue(buildUser())
      deviceRepository.findById.mockResolvedValue({
        id: 20,
        userId: 1,
        userAgent: 'jest',
        ip: '127.0.0.1',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(service.refreshToken(body)).rejects.toThrow('Device is inactive')

      expect(tokenService.signAccessToken).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    const body = {
      refreshToken: 'refresh-token',
    }

    it('deletes the refresh token and deactivates the device', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: body.refreshToken,
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.logout(body)

      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(hashToken(body.refreshToken))
      expect(refreshTokenRepository.consumeByToken).toHaveBeenCalledWith(hashToken(body.refreshToken), tx)
      expect(deviceRepository.updateActiveStatus).toHaveBeenCalledWith(20, false, tx)
      expect(result).toEqual({
        message: 'Logout successful',
      })
    })

    it('rejects logout when the refresh token is invalid', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(null)

      await expect(service.logout(body)).rejects.toThrow('Refresh token is invalid')

      expect(prismaService.$transaction).not.toHaveBeenCalled()
      expect(deviceRepository.updateActiveStatus).not.toHaveBeenCalled()
    })

    it('rejects logout when the refresh token was consumed concurrently', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 10,
        token: hashToken(body.refreshToken),
        userId: 1,
        deviceId: 20,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      refreshTokenRepository.consumeByToken.mockResolvedValue({ count: 0 })

      await expect(service.logout(body)).rejects.toThrow('Refresh token is invalid')

      expect(deviceRepository.updateActiveStatus).not.toHaveBeenCalled()
    })
  })

  describe('verifyEmail', () => {
    const body = {
      email: 'test@example.com',
      code: '123456',
    }

    it('verifies email and activates the user', async () => {
      const user = buildUser({ status: UserStatus.INACTIVE })
      const verificationCode = {
        id: 1,
        email: body.email,
        type: VerificationCodeType.REGISTER,
        code: body.code,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.findByEmail.mockResolvedValue(user)
      verificationCodeRepository.findByEmailAndType.mockResolvedValue(verificationCode)

      const result = await service.verifyEmail(body)

      expect(userRepository.updateStatus).toHaveBeenCalledWith(user.id, UserStatus.ACTIVE, tx)
      expect(verificationCodeRepository.deleteByEmailAndType).toHaveBeenCalledWith(
        body.email,
        VerificationCodeType.REGISTER,
        tx,
      )
      expect(result).toEqual({ message: 'Email verified successfully' })
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      await expect(service.verifyEmail(body)).rejects.toThrow('User not found')
    })

    it('rejects an already verified email', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.ACTIVE }))

      await expect(service.verifyEmail(body)).rejects.toThrow('Email is already verified')
      expect(verificationCodeRepository.findByEmailAndType).not.toHaveBeenCalled()
    })

    it('rejects a blocked account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }))

      await expect(service.verifyEmail(body)).rejects.toThrow('Account is blocked')
      expect(verificationCodeRepository.findByEmailAndType).not.toHaveBeenCalled()
    })

    it('rejects when the verification code does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))
      verificationCodeRepository.findByEmailAndType.mockResolvedValue(null)

      await expect(service.verifyEmail(body)).rejects.toThrow('Verification code is invalid')
    })

    it('rejects an expired verification code', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        id: 1,
        email: body.email,
        type: VerificationCodeType.REGISTER,
        code: body.code,
        expiresAt: new Date(Date.now() - 1_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(service.verifyEmail(body)).rejects.toThrow('Verification code has expired')
      expect(userRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('rejects an incorrect verification code', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        id: 1,
        email: body.email,
        type: VerificationCodeType.REGISTER,
        code: '999999',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(service.verifyEmail(body)).rejects.toThrow('Verification code is invalid')
      expect(userRepository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('resendVerificationCode', () => {
    const body = {
      email: 'test@example.com',
    }

    it('resends a verification code when the cooldown has passed', async () => {
      const user = buildUser({ status: UserStatus.INACTIVE })
      userRepository.findByEmail.mockResolvedValue(user)
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        id: 1,
        email: user.email,
        type: VerificationCodeType.REGISTER,
        code: '111111',
        expiresAt: new Date(),
        createdAt: new Date(Date.now() - 120_000),
        updatedAt: new Date(Date.now() - 120_000),
      })

      const result = await service.resendVerificationCode(body)

      expect(verificationCodeRepository.upsert).toHaveBeenCalledWith(
        user.email,
        VerificationCodeType.REGISTER,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      )
      const code = verificationCodeRepository.upsert.mock.calls[0][2] as string
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(user.email, code)
      expect(result).toEqual({ message: 'Verification code resent successfully' })
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      await expect(service.resendVerificationCode(body)).rejects.toThrow('User not found')
    })

    it('rejects when the user is already active', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())

      await expect(service.resendVerificationCode(body)).rejects.toThrow('User is already active')
    })

    it('rejects a blocked account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }))

      await expect(service.resendVerificationCode(body)).rejects.toThrow('Account is blocked')
    })

    it('enforces the resend cooldown', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        id: 1,
        email: body.email,
        type: VerificationCodeType.REGISTER,
        code: '111111',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 10_000),
      })

      await expect(service.resendVerificationCode(body)).rejects.toThrow(
        'You can only request a new code once per minute',
      )
      expect(verificationCodeRepository.upsert).not.toHaveBeenCalled()
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled()
    })
  })

  describe('forgotPassword', () => {
    const body = {
      email: 'test@example.com',
    }

    it('returns the generic response when the user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      const result = await service.forgotPassword(body)

      expect(result).toEqual({
        message: 'If the email exists, a reset code has been sent',
      })
      expect(verificationCodeRepository.upsert).not.toHaveBeenCalled()
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled()
    })

    it('creates and sends a password reset code', async () => {
      const user = buildUser()
      userRepository.findByEmail.mockResolvedValue(user)
      verificationCodeRepository.findByEmailAndType.mockResolvedValue(null)

      const result = await service.forgotPassword(body)

      expect(verificationCodeRepository.upsert).toHaveBeenCalledWith(
        user.email,
        VerificationCodeType.FORGOT_PASSWORD,
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      )
      const code = verificationCodeRepository.upsert.mock.calls[0][2] as string
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(user.email, code)
      expect(result).toEqual({
        message: 'If the email exists, a reset code has been sent',
      })
    })

    it('returns the generic response during the reset-code cooldown', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        id: 1,
        email: body.email,
        type: VerificationCodeType.FORGOT_PASSWORD,
        code: '111111',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 10_000),
      })

      const result = await service.forgotPassword(body)

      expect(result).toEqual({
        message: 'If the email exists, a reset code has been sent',
      })
      expect(verificationCodeRepository.upsert).not.toHaveBeenCalled()
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled()
    })

    it('rejects forgot password for an inactive account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))

      await expect(service.forgotPassword(body)).rejects.toThrow('Account is inactive')
    })

    it('rejects forgot password for a blocked account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }))

      await expect(service.forgotPassword(body)).rejects.toThrow('Account is blocked')
    })
  })

  describe('resetPassword', () => {
    const body = {
      email: 'test@example.com',
      code: '123456',
      password: 'new-secret',
      confirmPassword: 'new-secret',
    }

    const validResetCode = () => ({
      id: 1,
      email: body.email,
      type: VerificationCodeType.FORGOT_PASSWORD,
      code: body.code,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    it('resets the password and revokes existing sessions', async () => {
      const user = buildUser()
      userRepository.findByEmail.mockResolvedValue(user)
      verificationCodeRepository.findByEmailAndType.mockResolvedValue(validResetCode())
      hashingService.hash.mockResolvedValue('new-hashed-password')

      const result = await service.resetPassword(body)

      expect(hashingService.hash).toHaveBeenCalledWith(body.password)
      expect(userRepository.updatePassword).toHaveBeenCalledWith(user.id, 'new-hashed-password', tx)
      expect(verificationCodeRepository.deleteByEmailAndType).toHaveBeenCalledWith(
        body.email,
        VerificationCodeType.FORGOT_PASSWORD,
        tx,
      )
      expect(refreshTokenRepository.deleteAllByUserId).toHaveBeenCalledWith(user.id, tx)
      expect(deviceRepository.deactivateAllByUserId).toHaveBeenCalledWith(user.id, tx)
      expect(result).toEqual({ message: 'Password reset successfully' })
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      await expect(service.resetPassword(body)).rejects.toThrow('Reset code is invalid or expired')
    })

    it('rejects when the reset code does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())
      verificationCodeRepository.findByEmailAndType.mockResolvedValue(null)

      await expect(service.resetPassword(body)).rejects.toThrow('Reset code is invalid or expired')
      expect(hashingService.hash).not.toHaveBeenCalled()
    })

    it('rejects an expired reset code', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        ...validResetCode(),
        expiresAt: new Date(Date.now() - 1_000),
      })

      await expect(service.resetPassword(body)).rejects.toThrow('Reset code is invalid or expired')
      expect(hashingService.hash).not.toHaveBeenCalled()
    })

    it('rejects an incorrect reset code', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser())
      verificationCodeRepository.findByEmailAndType.mockResolvedValue({
        ...validResetCode(),
        code: '999999',
      })

      await expect(service.resetPassword(body)).rejects.toThrow('Reset code is invalid or expired')
      expect(hashingService.hash).not.toHaveBeenCalled()
    })

    it('rejects reset password for an inactive account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }))

      await expect(service.resetPassword(body)).rejects.toThrow('Account is inactive')
    })

    it('rejects reset password for a blocked account', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }))

      await expect(service.resetPassword(body)).rejects.toThrow('Account is blocked')
    })
  })

  describe('verifyTwoFactorLogin', () => {
    const body = {
      twoFactorToken: '2fa-token',
      code: '123456',
    }

    const challengeId = 'challenge-1'

    const setupSuccessfulSession = () => {
      deviceRepository.create.mockResolvedValue({
        id: 10,
        userId: 1,
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      tokenService.signAccessToken.mockResolvedValue('access-token')
      tokenService.signRefreshToken.mockResolvedValue('refresh-token')
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
    }

    it('verifies TOTP, consumes the challenge and creates a session', async () => {
      const user = buildUser({ totpEnabled: true, totpSecret: 'SECRET' })
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: user.id,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue(user.id.toString())
      redisClient.getDel.mockResolvedValue(user.id.toString())
      userRepository.findById.mockResolvedValue(user)
      twoFactorService.verifyCode.mockResolvedValue(true)
      setupSuccessfulSession()

      const result = await service.verifyTwoFactorLogin(body, deviceInfo)

      expect(twoFactorService.verifyCode).toHaveBeenCalledWith('SECRET', body.code)
      expect(redisClient.getDel).toHaveBeenCalledWith(`2fa:challengeId:${challengeId}`)
      expect(result).toEqual({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    })

    it('rejects an invalid or expired two-factor challenge', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue(null)

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication challenge is invalid or expired',
      )
      expect(userRepository.findById).not.toHaveBeenCalled()
    })

    it('rejects when the challenge belongs to another user', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('2')

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication challenge is invalid or expired',
      )
    })

    it('rejects when the user no longer exists', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(null)

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow('User not found')
    })

    it('rejects when two-factor authentication is disabled', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: false, totpSecret: null }))

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication is not enabled for this account',
      )
    })

    it('rejects an invalid TOTP code', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))
      twoFactorService.verifyCode.mockResolvedValue(false)

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow(
        'Invalid two-factor authentication code',
      )
      expect(redisClient.getDel).not.toHaveBeenCalled()
    })

    it('rejects when the challenge cannot be consumed', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      redisClient.getDel.mockResolvedValue(null)
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))
      twoFactorService.verifyCode.mockResolvedValue(true)

      await expect(service.verifyTwoFactorLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication challenge is invalid or expired',
      )
      expect(deviceRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('verifyTwoFactorRecoveryLogin', () => {
    const body = {
      twoFactorToken: '2fa-token',
      recoveryCode: 'ABCDEF-123456',
    }

    const challengeId = 'challenge-2'

    const setupSuccessfulSession = () => {
      deviceRepository.create.mockResolvedValue({
        id: 10,
        userId: 1,
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      tokenService.signAccessToken.mockResolvedValue('access-token')
      tokenService.signRefreshToken.mockResolvedValue('refresh-token')
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: 1,
        type: 'refresh',
        iat: 1,
        exp: 2_000_000_000,
      })
    }

    it('consumes a recovery code and creates a session', async () => {
      const user = buildUser({ totpEnabled: true, totpSecret: 'SECRET' })
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: user.id,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue(user.id.toString())
      redisClient.getDel.mockResolvedValue(user.id.toString())
      userRepository.findById.mockResolvedValue(user)
      twoFactorService.verifyRecoveryCode.mockResolvedValue({
        id: 30,
        userId: user.id,
        codeHash: 'hash',
        usedAt: null,
        createdAt: new Date(),
      })
      recoveryCodeRepository.consume.mockResolvedValue({ count: 1 })
      setupSuccessfulSession()

      const result = await service.verifyTwoFactorRecoveryLogin(body, deviceInfo)

      expect(twoFactorService.verifyRecoveryCode).toHaveBeenCalledWith(user.id, body.recoveryCode)
      expect(recoveryCodeRepository.consume).toHaveBeenCalledWith(30)
      expect(redisClient.getDel).toHaveBeenCalledWith(`2fa:challengeId:${challengeId}`)
      expect(result).toEqual({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    })

    it('rejects an invalid or expired challenge', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue(null)

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication challenge is invalid or expired',
      )
      expect(twoFactorService.verifyRecoveryCode).not.toHaveBeenCalled()
    })

    it('rejects when the user no longer exists', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(null)

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow('User not found')
    })

    it('rejects when two-factor authentication is disabled', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: false }))

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication is not enabled for this account',
      )
    })

    it('rejects an invalid recovery code', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true }))
      twoFactorService.verifyRecoveryCode.mockResolvedValue(null)

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow('Invalid recovery code')
      expect(recoveryCodeRepository.consume).not.toHaveBeenCalled()
    })

    it('rejects when the recovery code was consumed concurrently', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true }))
      twoFactorService.verifyRecoveryCode.mockResolvedValue({
        id: 30,
        userId: 1,
        codeHash: 'hash',
        usedAt: null,
        createdAt: new Date(),
      })
      recoveryCodeRepository.consume.mockResolvedValue({ count: 0 })

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow('Invalid recovery code')
      expect(redisClient.getDel).not.toHaveBeenCalled()
    })

    it('rejects when the challenge cannot be consumed after recovery-code consumption', async () => {
      tokenService.verifyTwoFactorToken.mockResolvedValue({
        userId: 1,
        challengeId,
        type: '2fa',
        iat: 1,
        exp: 2_000_000_000,
      })
      redisClient.get.mockResolvedValue('1')
      redisClient.getDel.mockResolvedValue(null)
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true }))
      twoFactorService.verifyRecoveryCode.mockResolvedValue({
        id: 30,
        userId: 1,
        codeHash: 'hash',
        usedAt: null,
        createdAt: new Date(),
      })
      recoveryCodeRepository.consume.mockResolvedValue({ count: 1 })

      await expect(service.verifyTwoFactorRecoveryLogin(body, deviceInfo)).rejects.toThrow(
        'Two-factor authentication challenge is invalid or expired',
      )
      expect(deviceRepository.create).not.toHaveBeenCalled()
    })
  })
})
