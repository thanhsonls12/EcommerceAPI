jest.mock('@/routes/order/order.service', () => ({
  OrderService: class OrderService {},
}))

import { INestApplication } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { OrderController } from '@/routes/order/order.controller'
import { OrderService } from '@/routes/order/order.service'
import CustomZodValidationPipe from '@/shared/pipes/custom-zod-validation.pipe'
import { REQUEST_USER_KEY } from '@/shared/constants/auth.constant'
import { OrderStatus } from '../generated/prisma/client'

describe('OrderController (e2e)', () => {
  let app: INestApplication

  const userId = 1

  const orderService = {
    create: jest.fn(),
    findMyOrders: jest.fn(),
    findMyOrderById: jest.fn(),
    cancel: jest.fn(),
    markPendingDelivery: jest.fn(),
    markDelivered: jest.fn(),
    markReturned: jest.fn(),
  }

  const order = {
    id: 10,
    userId,
    status: OrderStatus.PENDING_PAYMENT,
    subtotal: '200000',
    discount: '0',
    total: '200000',
    receiver: {
      name: 'Test User',
      phoneNumber: '0912345678',
      address: '123 Test Street',
    },
    items: [],
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    updatedAt: new Date('2026-09-15T00:00:00.000Z'),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: orderService },
        {
          provide: APP_PIPE,
          useClass: CustomZodValidationPipe,
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.use((req, _res, next) => {
      req[REQUEST_USER_KEY] = { userId }
      next()
    })
    await app.init()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/orders', () => {
    it('creates an order with a valid checkout request', async () => {
      const body = {
        addressId: 5,
        couponCode: 'SAVE10',
      }

      orderService.create.mockResolvedValue(order)

      const response = await request(app.getHttpServer()).post('/api/orders').send(body).expect(201)

      expect(orderService.create).toHaveBeenCalledWith(userId, body)
      expect(response.body).toMatchObject({
        id: order.id,
        userId,
        status: OrderStatus.PENDING_PAYMENT,
      })
    })

    it('creates an order without a coupon code', async () => {
      const body = {
        addressId: 5,
      }

      orderService.create.mockResolvedValue(order)

      await request(app.getHttpServer()).post('/api/orders').send(body).expect(201)

      expect(orderService.create).toHaveBeenCalledWith(userId, body)
    })

    it('returns 422 when addressId is missing', async () => {
      await request(app.getHttpServer()).post('/api/orders').send({}).expect(422)

      expect(orderService.create).not.toHaveBeenCalled()
    })

    it('returns 422 when addressId is not a positive integer', async () => {
      await request(app.getHttpServer()).post('/api/orders').send({ addressId: 0 }).expect(422)

      expect(orderService.create).not.toHaveBeenCalled()
    })

    it('returns 422 when couponCode is too short', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          addressId: 5,
          couponCode: 'A',
        })
        .expect(422)

      expect(orderService.create).not.toHaveBeenCalled()
    })

    it('returns 422 for unknown checkout fields', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          addressId: 5,
          unexpected: true,
        })
        .expect(422)

      expect(orderService.create).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/orders', () => {
    it('returns the current user orders', async () => {
      orderService.findMyOrders.mockResolvedValue([order])

      const response = await request(app.getHttpServer()).get('/api/orders').expect(200)

      expect(orderService.findMyOrders).toHaveBeenCalledWith(userId)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe(order.id)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('returns one order owned by the current user', async () => {
      orderService.findMyOrderById.mockResolvedValue(order)

      const response = await request(app.getHttpServer()).get('/api/orders/10').expect(200)

      expect(orderService.findMyOrderById).toHaveBeenCalledWith(userId, 10)
      expect(response.body.id).toBe(10)
    })

    it('returns 400 when the order id is not an integer', async () => {
      await request(app.getHttpServer()).get('/api/orders/not-a-number').expect(400)

      expect(orderService.findMyOrderById).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/orders/:id/cancel', () => {
    it('cancels the current user order', async () => {
      orderService.cancel.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
      })

      const response = await request(app.getHttpServer()).patch('/api/orders/10/cancel').expect(200)

      expect(orderService.cancel).toHaveBeenCalledWith(userId, 10)
      expect(response.body.status).toBe(OrderStatus.CANCELLED)
    })
  })

  describe('staff lifecycle routes', () => {
    it('marks an order as pending delivery', async () => {
      orderService.markPendingDelivery.mockResolvedValue({
        ...order,
        status: OrderStatus.PENDING_DELIVERY,
      })

      const response = await request(app.getHttpServer()).patch('/api/orders/10/pending-delivery').expect(200)

      expect(orderService.markPendingDelivery).toHaveBeenCalledWith(10, userId)
      expect(response.body.status).toBe(OrderStatus.PENDING_DELIVERY)
    })

    it('marks an order as delivered', async () => {
      orderService.markDelivered.mockResolvedValue({
        ...order,
        status: OrderStatus.DELIVERED,
      })

      const response = await request(app.getHttpServer()).patch('/api/orders/10/delivered').expect(200)

      expect(orderService.markDelivered).toHaveBeenCalledWith(10, userId)
      expect(response.body.status).toBe(OrderStatus.DELIVERED)
    })

    it('marks an order as returned', async () => {
      orderService.markReturned.mockResolvedValue({
        ...order,
        status: OrderStatus.RETURNED,
      })

      const response = await request(app.getHttpServer()).patch('/api/orders/10/returned').expect(200)

      expect(orderService.markReturned).toHaveBeenCalledWith(10, userId)
      expect(response.body.status).toBe(OrderStatus.RETURNED)
    })

    it('returns 400 for an invalid lifecycle order id', async () => {
      await request(app.getHttpServer()).patch('/api/orders/not-a-number/delivered').expect(400)

      expect(orderService.markDelivered).not.toHaveBeenCalled()
    })
  })
})
