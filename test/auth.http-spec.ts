jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}))

import { INestApplication } from '@nestjs/common'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { AuthController } from '@/routes/auth/auth.controller'
import { AuthService } from '@/routes/auth/auth.service'
import { TwoFactorService } from '@/routes/auth/two-factor.service'
import CustomZodValidationPipe from '@/shared/pipes/custom-zod-validation.pipe'
import { UserStatus } from '../generated/prisma/client'

describe('AuthController (http integration)', () => {
  let app: INestApplication

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationCode: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyTwoFactorLogin: jest.fn(),
    verifyTwoFactorRecoveryLogin: jest.fn(),
  }

  const twoFactorService = {
    setup: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  }

  const user = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    phoneNumber: '0912345678',
    avatar: null,
    status: UserStatus.ACTIVE,
    roleId: 2,
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    updatedAt: new Date('2026-09-15T00:00:00.000Z'),
    createdById: null,
    updatedById: null,
    deletedAt: null,
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TwoFactorService, useValue: twoFactorService },
        {
          provide: APP_PIPE,
          useClass: CustomZodValidationPipe,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ZodSerializerInterceptor,
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/register', () => {
    const body = {
      email: 'test@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
      name: 'Test User',
      phoneNumber: '0912345678',
    }

    it('returns 201 for a valid registration request', async () => {
      authService.register.mockResolvedValue(user)

      const response = await request(app.getHttpServer()).post('/api/auth/register').send(body).expect(201)

      expect(authService.register).toHaveBeenCalledWith(body)
      expect(response.body).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        status: UserStatus.ACTIVE,
        roleId: user.roleId,
      })
      expect(response.body.password).toBeUndefined()
    })

    it('returns 422 for an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...body,
          email: 'invalid-email',
        })
        .expect(422)

      expect(authService.register).not.toHaveBeenCalled()
    })

    it('returns 422 when password confirmation does not match', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...body,
          confirmPassword: 'different-password',
        })
        .expect(422)

      expect(authService.register).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/login', () => {
    const body = {
      email: 'test@example.com',
      password: 'secret123',
    }

    it('returns a normal login session', async () => {
      authService.login.mockResolvedValue({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('user-agent', 'e2e-test-agent')
        .send(body)
        .expect(201)

      expect(authService.login).toHaveBeenCalledWith(
        body,
        expect.objectContaining({
          userAgent: 'e2e-test-agent',
        }),
      )
      expect(response.body).toMatchObject({
        requiresTwoFactor: false,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
      expect(response.body.user.email).toBe(user.email)
    })

    it('returns a two-factor challenge when required', async () => {
      authService.login.mockResolvedValue({
        requiresTwoFactor: true,
        twoFactorToken: 'two-factor-token',
      })

      const response = await request(app.getHttpServer()).post('/api/auth/login').send(body).expect(201)

      expect(response.body).toEqual({
        requiresTwoFactor: true,
        twoFactorToken: 'two-factor-token',
      })
    })

    it('returns 422 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: body.email,
        })
        .expect(422)

      expect(authService.login).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/refresh-token', () => {
    it('returns a new token pair', async () => {
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      })

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'old-refresh-token' })
        .expect(201)

      expect(authService.refreshToken).toHaveBeenCalledWith({
        refreshToken: 'old-refresh-token',
      })
      expect(response.body).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      })
    })

    it('returns 422 for an empty refresh token', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh-token').send({ refreshToken: '' }).expect(422)

      expect(authService.refreshToken).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('logs out with a refresh token', async () => {
      authService.logout.mockResolvedValue({
        message: 'Logout successful',
      })

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken: 'refresh-token' })
        .expect(201)

      expect(authService.logout).toHaveBeenCalledWith({
        refreshToken: 'refresh-token',
      })
      expect(response.body).toEqual({
        message: 'Logout successful',
      })
    })
  })

  describe('POST /api/auth/verify-email', () => {
    it('verifies an email with a six-digit code', async () => {
      authService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      })

      const body = {
        email: 'test@example.com',
        code: '123456',
      }

      const response = await request(app.getHttpServer()).post('/api/auth/verify-email').send(body).expect(201)

      expect(authService.verifyEmail).toHaveBeenCalledWith(body)
      expect(response.body).toEqual({
        message: 'Email verified successfully',
      })
    })

    it('returns 422 when the verification code length is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({
          email: 'test@example.com',
          code: '123',
        })
        .expect(422)

      expect(authService.verifyEmail).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('returns the generic reset-code response', async () => {
      authService.forgotPassword.mockResolvedValue({
        message: 'If the email exists, a reset code has been sent',
      })

      const body = {
        email: 'test@example.com',
      }

      const response = await request(app.getHttpServer()).post('/api/auth/forgot-password').send(body).expect(201)

      expect(authService.forgotPassword).toHaveBeenCalledWith(body)
      expect(response.body).toEqual({
        message: 'If the email exists, a reset code has been sent',
      })
    })
  })

  describe('POST /api/auth/reset-password', () => {
    const body = {
      email: 'test@example.com',
      code: '123456',
      password: 'new-secret',
      confirmPassword: 'new-secret',
    }

    it('resets the password with a valid request', async () => {
      authService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      })

      const response = await request(app.getHttpServer()).post('/api/auth/reset-password').send(body).expect(201)

      expect(authService.resetPassword).toHaveBeenCalledWith(body)
      expect(response.body).toEqual({
        message: 'Password reset successfully',
      })
    })

    it('returns 422 when password confirmation does not match', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          ...body,
          confirmPassword: 'different-password',
        })
        .expect(422)

      expect(authService.resetPassword).not.toHaveBeenCalled()
    })
  })

  describe('public two-factor login routes', () => {
    it('verifies a TOTP login request', async () => {
      authService.verifyTwoFactorLogin.mockResolvedValue({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })

      const body = {
        twoFactorToken: 'two-factor-token',
        code: '123456',
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/2fa/verify-login')
        .send(body)
        .expect(201)

      expect(authService.verifyTwoFactorLogin).toHaveBeenCalledWith(
        body,
        expect.objectContaining({
          userAgent: expect.any(String),
        }),
      )
      expect(response.body.requiresTwoFactor).toBe(false)
    })

    it('returns 422 for an invalid TOTP code format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/2fa/verify-login')
        .send({
          twoFactorToken: 'two-factor-token',
          code: '12ab',
        })
        .expect(422)

      expect(authService.verifyTwoFactorLogin).not.toHaveBeenCalled()
    })

    it('verifies a recovery-code login request', async () => {
      authService.verifyTwoFactorRecoveryLogin.mockResolvedValue({
        requiresTwoFactor: false,
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })

      const body = {
        twoFactorToken: 'two-factor-token',
        recoveryCode: 'ABCDEF-123456',
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/2fa/verify-recovery-code')
        .send(body)
        .expect(201)

      expect(authService.verifyTwoFactorRecoveryLogin).toHaveBeenCalledWith(
        body,
        expect.objectContaining({
          userAgent: expect.any(String),
        }),
      )
      expect(response.body.requiresTwoFactor).toBe(false)
    })
  })
})
