jest.mock('@/routes/payment/payment.service', () => ({
  PaymentService: class PaymentService {},
}))

import { INestApplication } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { PaymentController } from '@/routes/payment/payment.controller'
import { PaymentService } from '@/routes/payment/payment.service'
import CustomZodValidationPipe from '@/shared/pipes/custom-zod-validation.pipe'
import { REQUEST_USER_KEY } from '@/shared/constants/auth.constant'

describe('PaymentController (http integration)', () => {
  let app: INestApplication

  const userId = 1

  const paymentService = {
    create: jest.fn(),
    handleWebhook: jest.fn(),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
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

  describe('POST /api/payments', () => {
    it('creates a payment for the current user order', async () => {
      const body = {
        orderId: 10,
      }

      paymentService.create.mockResolvedValue({
        paymentId: 20,
        checkoutUrl: 'https://checkout.example.com/payment/20',
      })

      const response = await request(app.getHttpServer()).post('/api/payments').send(body).expect(201)

      expect(paymentService.create).toHaveBeenCalledWith(userId, body)
      expect(response.body).toEqual({
        paymentId: 20,
        checkoutUrl: 'https://checkout.example.com/payment/20',
      })
    })

    it('returns 422 when orderId is missing', async () => {
      await request(app.getHttpServer()).post('/api/payments').send({}).expect(422)

      expect(paymentService.create).not.toHaveBeenCalled()
    })

    it('returns 422 when orderId is zero', async () => {
      await request(app.getHttpServer()).post('/api/payments').send({ orderId: 0 }).expect(422)

      expect(paymentService.create).not.toHaveBeenCalled()
    })

    it('returns 422 when orderId is negative', async () => {
      await request(app.getHttpServer()).post('/api/payments').send({ orderId: -1 }).expect(422)

      expect(paymentService.create).not.toHaveBeenCalled()
    })

    it('returns 422 when orderId is not an integer', async () => {
      await request(app.getHttpServer()).post('/api/payments').send({ orderId: 10.5 }).expect(422)

      expect(paymentService.create).not.toHaveBeenCalled()
    })

    it('returns 422 for unknown payment fields', async () => {
      await request(app.getHttpServer())
        .post('/api/payments')
        .send({
          orderId: 10,
          unexpected: true,
        })
        .expect(422)

      expect(paymentService.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/payments/webhook', () => {
    it('forwards the webhook payload to PaymentService', async () => {
      const payload = {
        code: '00',
        data: {
          orderCode: 123456,
          amount: 200000,
          reference: 'transaction-1',
        },
        signature: 'signature',
      }

      paymentService.handleWebhook.mockResolvedValue({
        success: true,
        duplicate: false,
      })

      const response = await request(app.getHttpServer()).post('/api/payments/webhook').send(payload).expect(201)

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(payload)
      expect(response.body).toEqual({
        success: true,
        duplicate: false,
      })
    })

    it('returns a successful response for a duplicate webhook', async () => {
      const payload = {
        code: '00',
        data: {
          orderCode: 123456,
          reference: 'transaction-1',
        },
      }

      paymentService.handleWebhook.mockResolvedValue({
        success: true,
        duplicate: true,
      })

      const response = await request(app.getHttpServer()).post('/api/payments/webhook').send(payload).expect(201)

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(payload)
      expect(response.body).toEqual({
        success: true,
        duplicate: true,
      })
    })

    it('accepts arbitrary provider webhook payloads without DTO validation', async () => {
      const payload = {
        providerSpecificField: 'value',
        nested: {
          anything: true,
        },
      }

      paymentService.handleWebhook.mockResolvedValue({
        success: true,
        duplicate: false,
      })

      await request(app.getHttpServer()).post('/api/payments/webhook').send(payload).expect(201)

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(payload)
    })
  })
})
