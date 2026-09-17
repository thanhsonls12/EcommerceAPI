jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}))

jest.mock('@/routes/order/order-email.processor', () => ({
  OrderEmailProcessor: class OrderEmailProcessor {},
}))

import { Global, INestApplication, Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { PinoLogger } from 'nestjs-pino'
import { AuthModule } from '@/routes/auth/auth.module'
import { OrderModule } from '@/routes/order/order.module'
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
import { PermissionName } from '@/shared/constants/permission.constant'
import { RoleName } from '@/shared/constants/role.constant'
import { HTTPMethod, InventoryTransactionType, OrderStatus, UserStatus } from '../../generated/prisma/client'

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

const pinoLogger = {
  setContext: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
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
    { provide: PinoLogger, useValue: pinoLogger },
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
    PinoLogger,
  ],
})
class E2ETestSharedModule {}

@Module({
  imports: [E2ETestSharedModule, AuthModule, OrderModule],
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
class OrderFlowE2EModule {}

describe('Order flow and permissions (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let hashingService: HashingService

  const clientEmail = 'e2e.order.client@example.com'
  const sellerEmail = 'e2e.order.seller@example.com'
  const clientPhone = '0388888881'
  const sellerPhone = '0388888882'
  const password = 'secret123'

  const cleanupFixture = async () => {
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [clientEmail, sellerEmail],
        },
      },
      select: {
        id: true,
      },
    })

    const userIds = users.map((user) => user.id)

    if (userIds.length === 0) {
      return
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        id: true,
      },
    })

    const orderIds = orders.map((order) => order.id)

    if (orderIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: {
          referenceType: 'ORDER',
          referenceId: {
            in: orderIds,
          },
        },
      })

      await prisma.order.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      })
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    })
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [OrderFlowE2EModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()

    prisma = moduleRef.get(PrismaService)
    hashingService = moduleRef.get(HashingService)

    await cleanupFixture()
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

  it('creates a real order, protects staff lifecycle routes, and allows a seller with ORDER_UPDATE', async () => {
    const orderUpdatePermission = await prisma.permission.upsert({
      where: { name: PermissionName.OrderUpdate },
      update: {
        description: 'Update order',
        path: '/orders/:id',
        method: HTTPMethod.PATCH,
        module: 'ORDER',
        deletedAt: null,
      },
      create: {
        name: PermissionName.OrderUpdate,
        description: 'Update order',
        path: '/orders/:id',
        method: HTTPMethod.PATCH,
        module: 'ORDER',
      },
    })

    const clientRole = await prisma.role.upsert({
      where: { name: RoleName.Client },
      update: {
        isActive: true,
        deletedAt: null,
        permissions: {
          disconnect: [{ id: orderUpdatePermission.id }],
        },
      },
      create: {
        name: RoleName.Client,
        description: 'E2E client role',
        permissions: {
          connect: [],
        },
      },
    })

    const sellerRole = await prisma.role.upsert({
      where: { name: RoleName.Seller },
      update: {
        isActive: true,
        deletedAt: null,
        permissions: {
          connect: [{ id: orderUpdatePermission.id }],
        },
      },
      create: {
        name: RoleName.Seller,
        description: 'E2E seller role',
        permissions: {
          connect: [{ id: orderUpdatePermission.id }],
        },
      },
    })

    const hashedPassword = await hashingService.hash(password)

    const client = await prisma.user.create({
      data: {
        email: clientEmail,
        name: 'E2E Order Client',
        password: hashedPassword,
        phoneNumber: clientPhone,
        status: UserStatus.ACTIVE,
        roleId: clientRole.id,
      },
    })

    const seller = await prisma.user.create({
      data: {
        email: sellerEmail,
        name: 'E2E Order Seller',
        password: hashedPassword,
        phoneNumber: sellerPhone,
        status: UserStatus.ACTIVE,
        roleId: sellerRole.id,
      },
    })

    const clientLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: clientEmail,
        password,
      })
      .expect(201)

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: sellerEmail,
        password,
      })
      .expect(201)

    const clientAccessToken = clientLogin.body.accessToken as string
    const sellerAccessToken = sellerLogin.body.accessToken as string

    const address = await prisma.address.create({
      data: {
        userId: client.id,
        name: client.name,
        phoneNumber: client.phoneNumber,
        address: '123 E2E Street',
        isDefault: true,
      },
    })

    const brand = await prisma.brand.create({
      data: {
        name: 'E2E Order Brand',
        logo: 'https://example.com/e2e-brand.png',
        createdById: seller.id,
      },
    })

    const product = await prisma.product.create({
      data: {
        name: 'E2E Order Product',
        basePrice: 100000,
        virtualPrice: 120000,
        brandId: brand.id,
        images: ['https://example.com/e2e-product.png'],
        variants: [],
        createdById: seller.id,
      },
    })

    const sku = await prisma.sku.create({
      data: {
        value: {
          color: 'Black',
        },
        price: 100000,
        stock: 5,
        image: 'https://example.com/e2e-sku.png',
        productId: product.id,
        createdById: seller.id,
      },
    })

    await prisma.cartItem.create({
      data: {
        userId: client.id,
        skuId: sku.id,
        quantity: 2,
      },
    })

    const createResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('authorization', `Bearer ${clientAccessToken}`)
      .send({
        addressId: address.id,
      })
      .expect(201)

    expect(createResponse.body).toMatchObject({
      userId: client.id,
      status: OrderStatus.PENDING_PAYMENT,
    })

    const orderId = createResponse.body.id as number

    const persistedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    expect(persistedOrder).not.toBeNull()
    expect(persistedOrder?.items).toHaveLength(1)
    expect(persistedOrder?.items[0].quantity).toBe(2)

    const persistedSku = await prisma.sku.findUnique({
      where: { id: sku.id },
    })

    expect(persistedSku?.stock).toBe(3)

    await expect(
      prisma.cartItem.count({
        where: { userId: client.id },
      }),
    ).resolves.toBe(0)

    const saleTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        referenceType: 'ORDER',
        referenceId: orderId,
        skuId: sku.id,
        type: InventoryTransactionType.SALE,
      },
    })

    expect(saleTransaction).toMatchObject({
      quantity: 2,
      stockBefore: 5,
      stockAfter: 3,
      createdById: client.id,
    })
    expect(emailQueueService.addOrderCreated).toHaveBeenCalledWith(orderId)

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('authorization', `Bearer ${clientAccessToken}`)
      .expect(200)

    expect(detailResponse.body.id).toBe(orderId)

    await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/pending-delivery`)
      .set('authorization', `Bearer ${clientAccessToken}`)
      .expect(403)

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PENDING_PICKUP,
      },
    })

    const pendingDeliveryResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/pending-delivery`)
      .set('authorization', `Bearer ${sellerAccessToken}`)
      .expect(200)

    expect(pendingDeliveryResponse.body.status).toBe(OrderStatus.PENDING_DELIVERY)

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    expect(updatedOrder).toMatchObject({
      status: OrderStatus.PENDING_DELIVERY,
      updatedById: seller.id,
    })
    expect(emailQueueService.addOrderPendingDelivery).toHaveBeenCalledWith(orderId)
    expect(realtimeService.orderUpdated).toHaveBeenCalledWith(client.id, {
      orderId,
      status: OrderStatus.PENDING_DELIVERY,
    })
  })
})
