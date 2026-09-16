jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}))

import { Global, INestApplication, Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { AuthModule } from '@/routes/auth/auth.module'
import { UserModule } from '@/routes/user/user.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { HashingService } from '@/shared/services/hashing.service'
import { TokenService } from '@/shared/services/token.service'
import { EmailService } from '@/shared/services/email.service'
import { RedisService } from '@/shared/services/redis.service'
import { AccessTokenGuard } from '@/shared/guards/access-token.guard'
import { APIKeyGuard } from '@/shared/guards/api-key.guard'
import { AuthenticationGuard } from '@/shared/guards/authentication.guard'
import { PermissionsGuard } from '@/shared/guards/permissions.guard'
import CustomZodValidationPipe from '@/shared/pipes/custom-zod-validation.pipe'
import { CatchEverythingFilter } from '@/shared/filters/catch-everything.filter'
import { UserStatus, VerificationCodeType } from '../../generated/prisma/client'

const emailService = {
  sendVerificationCode: jest.fn(),
}

const redisService = {
  getClient: jest.fn(() => ({
    get: jest.fn(),
    getDel: jest.fn(),
    set: jest.fn(),
  })),
}

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    PrismaService,
    HashingService,
    TokenService,
    AccessTokenGuard,
    APIKeyGuard,
    AuthenticationGuard,
    PermissionsGuard,
    { provide: EmailService, useValue: emailService },
    { provide: RedisService, useValue: redisService },
  ],
  exports: [
    PrismaService,
    HashingService,
    TokenService,
    AccessTokenGuard,
    APIKeyGuard,
    AuthenticationGuard,
    PermissionsGuard,
    EmailService,
    RedisService,
  ],
})
class E2ETestSharedModule {}

@Module({
  imports: [E2ETestSharedModule, AuthModule, UserModule],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
class AuthFlowE2EModule {}

describe('Auth flow (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const email = 'e2e.auth@example.com'
  const phoneNumber = '0399999999'
  const password = 'secret123'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthFlowE2EModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()

    prisma = moduleRef.get(PrismaService)

    await prisma.verificationCode.deleteMany({
      where: { email },
    })
    await prisma.user.deleteMany({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    if (!prisma) {
      await app?.close()
      return
    }

    await prisma.verificationCode.deleteMany({
      where: { email },
    })
    await prisma.user.deleteMany({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    })

    await app.close()
  })

  it('registers, verifies email, logs in, authenticates the user and enforces permissions', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password,
        confirmPassword: password,
        name: 'E2E Auth User',
        phoneNumber,
      })
      .expect(201)

    expect(registerResponse.body).toMatchObject({
      email,
      phoneNumber,
      status: UserStatus.INACTIVE,
    })
    expect(registerResponse.body.password).toBeUndefined()
    expect(emailService.sendVerificationCode).toHaveBeenCalledTimes(1)

    const storedUserBeforeVerification = await prisma.user.findUnique({
      where: { email },
    })

    expect(storedUserBeforeVerification).not.toBeNull()
    expect(storedUserBeforeVerification?.status).toBe(UserStatus.INACTIVE)
    expect(storedUserBeforeVerification?.password).not.toBe(password)

    const verificationCode = await prisma.verificationCode.findUnique({
      where: {
        email_type: {
          email,
          type: VerificationCodeType.REGISTER,
        },
      },
    })

    expect(verificationCode).not.toBeNull()

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({
        email,
        code: verificationCode!.code,
      })
      .expect(201)

    const storedUserAfterVerification = await prisma.user.findUnique({
      where: { email },
    })

    expect(storedUserAfterVerification?.status).toBe(UserStatus.ACTIVE)

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('user-agent', 'e2e-auth-test')
      .send({
        email,
        password,
      })
      .expect(201)

    expect(loginResponse.body.requiresTwoFactor).toBe(false)
    expect(loginResponse.body.accessToken).toEqual(expect.any(String))
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String))

    const accessToken = loginResponse.body.accessToken as string

    const profileResponse = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(profileResponse.body).toMatchObject({
      email,
      phoneNumber,
      status: UserStatus.ACTIVE,
    })

    await request(app.getHttpServer()).get('/api/users').set('authorization', `Bearer ${accessToken}`).expect(403)
  })
})
