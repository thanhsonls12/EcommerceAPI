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
import { PaymentController } from '@/routes/payment/payment.controller'
import { PaymentService } from '@/routes/payment/payment.service'
import { PaymentRepository } from '@/routes/payment/payment.repository'
import { PAYMENT_GATEWAY, PaymentGateway } from '@/routes/payment/gateways/payment-gateway.interface'
import { NotificationService } from '@/routes/notification/notification.service'
import { NotificationRepository } from '@/routes/notification/notification.repository'
import { PrismaService } from '@/shared/services/prisma.service'
import { HashingService } from '@/shared/services/hashing.service'
import { TokenService } from '@/shared/services/token.service'
import { EmailService } from '@/shared/services/email.service'
import { EmailQueueService } from '@/shared/services/email-queue.service'
import { RedisService } from '@/shared/services/redis.service'
import { AccessTokenGuard } from '@/shared/guards/access-token.guard'
import { APIKeyGuard } from '@/shared/guards/api-key.guard'
import { AuthenticationGuard } from '@/shared/guards/authentication.guard'
import { PermissionsGuard } from '@/shared/guards/permissions.guard'
import CustomZodValidationPipe from '@/shared/pipes/custom-zod-validation.pipe'
import { CatchEverythingFilter } from '@/shared/filters/catch-everything.filter'
import { RealtimeService } from '@/routes/realtime/realtime.service'
import { RoleName } from '@/shared/constants/role.constant'
import { NotificationType, OrderStatus, PaymentStatus, UserStatus } from '../../generated/prisma/client'

const emailService = {
  sendVerificationCode: jest.fn(),
}

const emailQueueService = {
  addOrderCreated: jest.fn(),
  addOrderPendingDelivery: jest.fn(),
  addOrderDelivered: jest.fn(),
  addOrderReturned: jest.fn(),
  addOrderCancelled: jest.fn(),
  addOrderPaid: jest.fn(),
}

const realtimeService = {
  orderUpdated: jest.fn(),
  orderPaid: jest.fn(),
  orderCancelled: jest.fn(),
  notificationCreated: jest.fn(),
}

const redisService = {
  getClient: jest.fn(() => ({
    get: jest.fn(),
    getDel: jest.fn(),
    set: jest.fn(),
  })),
}

const paymentGateway: PaymentGateway = {
  name: 'E2E_GATEWAY',
  createPayment: jest.fn(),
  verifyWebhook: jest.fn(),
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
    { provide: EmailQueueService, useValue: emailQueueService },
    { provide: RealtimeService, useValue: realtimeService },
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
    EmailQueueService,
    RealtimeService,
    RedisService,
  ],
})
class E2ETestSharedModule {}

@Module({
  imports: [E2ETestSharedModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentRepository,
    NotificationService,
    NotificationRepository,
    {
      provide: PAYMENT_GATEWAY,
      useValue: paymentGateway,
    },
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
class PaymentWebhookFlowE2EModule {}

describe('Payment webhook flow (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let userId: number
  let orderId: number
  let paymentId: number

  const email = 'e2e.payment@example.com'
  const phoneNumber = '0377777777'
  const paymentReference = 'e2e-payment-reference'
  const transactionReference = 'e2e-transaction-reference'
  const amount = 200000

  const cleanupFixture = async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!user) {
      return
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        paymentId: true,
      },
    })

    const orderIds = orders.map((order) => order.id)
    const paymentIds = orders.map((order) => order.paymentId).filter((id): id is number => id !== null)

    await prisma.notification.deleteMany({
      where: { userId: user.id },
    })

    if (paymentIds.length > 0) {
      await prisma.paymentTransaction.deleteMany({
        where: {
          paymentId: {
            in: paymentIds,
          },
        },
      })
    }

    if (orderIds.length > 0) {
      await prisma.order.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      })
    }

    if (paymentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: {
          id: {
            in: paymentIds,
          },
        },
      })
    }

    await prisma.user.delete({
      where: { id: user.id },
    })
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PaymentWebhookFlowE2EModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()

    prisma = moduleRef.get(PrismaService)

    await cleanupFixture()

    const clientRole = await prisma.role.upsert({
      where: { name: RoleName.Client },
      update: {
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: RoleName.Client,
        description: 'E2E client role',
      },
    })

    const user = await prisma.user.create({
      data: {
        email,
        name: 'E2E Payment User',
        password: 'unused-e2e-password',
        phoneNumber,
        status: UserStatus.ACTIVE,
        roleId: clientRole.id,
      },
    })

    userId = user.id

    const payment = await prisma.payment.create({
      data: {
        status: PaymentStatus.PENDING,
        amount,
        gateway: paymentGateway.name,
        reference: paymentReference,
      },
    })

    paymentId = payment.id

    const order = await prisma.order.create({
      data: {
        user: {
          connect: {
            id: user.id,
          },
        },
        status: OrderStatus.PENDING_PAYMENT,
        receiver: {
          name: user.name,
          phoneNumber: user.phoneNumber,
          address: '123 E2E Payment Street',
        },
        subtotal: amount,
        discount: 0,
        total: amount,
        payment: {
          connect: {
            id: payment.id,
          },
        },
        createdBy: {
          connect: {
            id: user.id,
          },
        },
      },
    })

    orderId = order.id
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    if (prisma) {
      await cleanupFixture()
    }

    await app?.close()
  })

  it('processes a successful webhook once and treats a retry as duplicate', async () => {
    const rawPayload = {
      event: 'payment.success',
      providerPayload: {
        reference: transactionReference,
      },
    }

    jest.mocked(paymentGateway.verifyWebhook).mockResolvedValue({
      paymentReference,
      transactionReference,
      amount,
      success: true,
      rawBody: rawPayload,
    })

    const firstResponse = await request(app.getHttpServer()).post('/api/payments/webhook').send(rawPayload).expect(201)

    expect(firstResponse.body).toEqual({
      success: true,
      duplicate: false,
    })

    const paymentAfterWebhook = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    expect(paymentAfterWebhook?.status).toBe(PaymentStatus.SUCCESS)

    const orderAfterWebhook = await prisma.order.findUnique({
      where: { id: orderId },
    })

    expect(orderAfterWebhook?.status).toBe(OrderStatus.PENDING_PICKUP)

    const transaction = await prisma.paymentTransaction.findUnique({
      where: {
        gateway_referenceNumber: {
          gateway: paymentGateway.name,
          referenceNumber: transactionReference,
        },
      },
    })

    expect(transaction).toMatchObject({
      paymentId,
      amountIn: expect.anything(),
    })
    expect(Number(transaction?.amountIn)).toBe(amount)

    const notification = await prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.PAYMENT,
      },
    })

    expect(notification).toMatchObject({
      title: 'Payment successful',
      content: `Payment for order #${orderId} was successful`,
    })

    expect(emailQueueService.addOrderPaid).toHaveBeenCalledTimes(1)
    expect(emailQueueService.addOrderPaid).toHaveBeenCalledWith(orderId)
    expect(realtimeService.orderPaid).toHaveBeenCalledWith(userId, orderId)
    expect(realtimeService.orderUpdated).toHaveBeenCalledWith(userId, {
      orderId,
      status: OrderStatus.PENDING_PICKUP,
    })

    const secondResponse = await request(app.getHttpServer()).post('/api/payments/webhook').send(rawPayload).expect(201)

    expect(secondResponse.body).toEqual({
      success: true,
      duplicate: true,
    })

    await expect(
      prisma.paymentTransaction.count({
        where: {
          paymentId,
          gateway: paymentGateway.name,
          referenceNumber: transactionReference,
        },
      }),
    ).resolves.toBe(1)

    await expect(
      prisma.notification.count({
        where: {
          userId,
          type: NotificationType.PAYMENT,
        },
      }),
    ).resolves.toBe(1)

    expect(emailQueueService.addOrderPaid).toHaveBeenCalledTimes(1)
    expect(realtimeService.orderPaid).toHaveBeenCalledTimes(1)
    expect(realtimeService.orderUpdated).toHaveBeenCalledTimes(1)
  })
})
