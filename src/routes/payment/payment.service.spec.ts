jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  getQueueToken: (name?: string) => `BullQueue_${name ?? ''}`,
}))

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { PaymentService } from './payment.service'
import { PaymentRepository } from './payment.repository'
import { PAYMENT_GATEWAY, PaymentGateway } from './gateways/payment-gateway.interface'
import { EmailQueueService } from '@/shared/services/email-queue.service'
import { RealtimeService } from '../realtime/realtime.service'
import { NotificationService } from '../notification/notification.service'
import { OrderStatus, PaymentStatus, Prisma } from '../../../generated/prisma/client'

describe('PaymentService', () => {
  let service: PaymentService
  type PaymentRepositoryMock = {
    transaction: jest.Mock
    findOrderForPayment: jest.Mock
    create: jest.Mock
    attachPayment: jest.Mock
    updateGatewayInfo: jest.Mock
    findByGatewayReference: jest.Mock
    findTransaction: jest.Mock
    createTransaction: jest.Mock
    markPaymentSuccess: jest.Mock
    markOrderPaid: jest.Mock
  }

  type PaymentGatewayMock = {
    name: string
    createPayment: jest.Mock
    verifyWebhook: jest.Mock
  }

  type EmailQueueServiceMock = {
    addOrderPaid: jest.Mock
  }

  type RealtimeServiceMock = {
    orderPaid: jest.Mock
    orderUpdated: jest.Mock
  }

  type NotificationServiceMock = {
    create: jest.Mock
  }

  let repository: PaymentRepositoryMock
  let gateway: PaymentGatewayMock
  let emailQueueService: EmailQueueServiceMock
  let realtimeService: RealtimeServiceMock
  let notificationService: NotificationServiceMock

  const tx = {} as Prisma.TransactionClient

  beforeEach(async () => {
    repository = {
      transaction: jest.fn((cb) => cb(tx)),
      findOrderForPayment: jest.fn(),
      create: jest.fn(),
      attachPayment: jest.fn(),
      updateGatewayInfo: jest.fn(),
      findByGatewayReference: jest.fn(),
      findTransaction: jest.fn(),
      createTransaction: jest.fn(),
      markPaymentSuccess: jest.fn(),
      markOrderPaid: jest.fn(),
    }

    gateway = {
      name: 'mock',
      createPayment: jest.fn(),
      verifyWebhook: jest.fn(),
    }

    emailQueueService = {
      addOrderPaid: jest.fn(),
    }

    realtimeService = {
      orderPaid: jest.fn(),
      orderUpdated: jest.fn(),
    }

    notificationService = {
      create: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: repository },
        { provide: PAYMENT_GATEWAY, useValue: gateway },
        { provide: EmailQueueService, useValue: emailQueueService },
        { provide: RealtimeService, useValue: realtimeService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile()

    service = module.get<PaymentService>(PaymentService)
  })

  describe('create', () => {
    const userId = 1
    const body = { orderId: 10 }
    const order = {
      id: 10,
      userId,
      total: new Prisma.Decimal(100),
      status: OrderStatus.PENDING_PAYMENT,
      payment: null,
    }
    const payment = {
      id: 99,
      amount: new Prisma.Decimal(100),
      status: PaymentStatus.PENDING,
    }

    it('creates payment and returns checkoutUrl', async () => {
      repository.findOrderForPayment.mockResolvedValue(order)
      repository.create.mockResolvedValue(payment)
      repository.attachPayment.mockResolvedValue({ count: 1 })
      repository.updateGatewayInfo.mockResolvedValue({})
      gateway.createPayment.mockResolvedValue({
        checkoutUrl: 'https://pay.example.com/checkout',
        providerReference: 'ref-1',
      })

      const result = await service.create(userId, body)

      expect(result).toEqual({ paymentId: 99, checkoutUrl: 'https://pay.example.com/checkout' })
      expect(repository.create).toHaveBeenCalledWith(tx, order.total)
      expect(repository.attachPayment).toHaveBeenCalledWith(tx, 10, userId, 99)
      expect(gateway.createPayment).toHaveBeenCalledWith({
        paymentId: 99,
        orderId: 10,
        amount: 100,
        description: 'Order 10 payment',
      })
      expect(repository.updateGatewayInfo).toHaveBeenCalledWith(99, 'mock', 'ref-1')
    })

    it('throws NotFoundException when order not found', async () => {
      repository.findOrderForPayment.mockResolvedValue(null)

      await expect(service.create(userId, body)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when order is not PENDING_PAYMENT', async () => {
      repository.findOrderForPayment.mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
      })

      await expect(service.create(userId, body)).rejects.toThrow(ConflictException)
    })

    it('returns existing PENDING payment without creating a new one', async () => {
      const existingPayment = { id: 50, amount: new Prisma.Decimal(100), status: PaymentStatus.PENDING }
      repository.findOrderForPayment.mockResolvedValue({
        ...order,
        payment: existingPayment,
      })
      gateway.createPayment.mockResolvedValue({
        checkoutUrl: 'https://pay.example.com/checkout',
        providerReference: 'ref-existing',
      })
      repository.updateGatewayInfo.mockResolvedValue({})

      const result = await service.create(userId, body)

      expect(result.paymentId).toBe(50)
      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.attachPayment).not.toHaveBeenCalled()
    })

    it('throws ConflictException when existing payment is not PENDING', async () => {
      repository.findOrderForPayment.mockResolvedValue({
        ...order,
        payment: { id: 50, status: PaymentStatus.SUCCESS },
      })

      await expect(service.create(userId, body)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when attachPayment count is 0', async () => {
      repository.findOrderForPayment.mockResolvedValue(order)
      repository.create.mockResolvedValue(payment)
      repository.attachPayment.mockResolvedValue({ count: 0 })

      await expect(service.create(userId, body)).rejects.toThrow(ConflictException)
    })
  })

  describe('handleWebhook', () => {
    const webhook = {
      paymentReference: 'ref-1',
      transactionReference: 'txn-1',
      amount: 100,
      success: true,
      rawBody: { event: 'paid' },
    }

    const paymentRecord = {
      id: 99,
      amount: new Prisma.Decimal(100),
      status: PaymentStatus.PENDING,
      order: { id: 10, userId: 1 },
    }

    beforeEach(() => {
      gateway.verifyWebhook.mockResolvedValue(webhook)
    })

    it('processes successful webhook and notifies user', async () => {
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 1 })
      repository.markPaymentSuccess.mockResolvedValue({ count: 1 })
      repository.markOrderPaid.mockResolvedValue({ count: 1 })

      const result = await service.handleWebhook({})

      expect(result).toEqual({ success: true, duplicate: false })
      expect(emailQueueService.addOrderPaid).toHaveBeenCalledWith(10)
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, type: 'PAYMENT' }),
      )
      expect(realtimeService.orderPaid).toHaveBeenCalledWith(1, 10)
      expect(realtimeService.orderUpdated).toHaveBeenCalledWith(1, {
        orderId: 10,
        status: OrderStatus.PENDING_PICKUP,
      })
    })

    it('throws NotFoundException when payment not found', async () => {
      repository.findByGatewayReference.mockResolvedValue(null)

      await expect(service.handleWebhook({})).rejects.toThrow(NotFoundException)
    })

    it('returns duplicate when transaction already exists', async () => {
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue({ id: 1 })

      const result = await service.handleWebhook({})

      expect(result).toEqual({ success: true, duplicate: true })
      expect(repository.createTransaction).not.toHaveBeenCalled()
      expect(emailQueueService.addOrderPaid).not.toHaveBeenCalled()
    })

    it('throws BadRequestException on amount mismatch', async () => {
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue(null)
      gateway.verifyWebhook.mockResolvedValue({ ...webhook, amount: 999 })

      await expect(service.handleWebhook({})).rejects.toThrow(BadRequestException)
    })

    it('returns success without notifying when webhook.success is false', async () => {
      gateway.verifyWebhook.mockResolvedValue({ ...webhook, success: false })
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 1 })

      const result = await service.handleWebhook({})

      expect(result).toEqual({ success: true, duplicate: false })
      expect(repository.markPaymentSuccess).not.toHaveBeenCalled()
      expect(emailQueueService.addOrderPaid).not.toHaveBeenCalled()
    })

    it('returns duplicate when createTransaction returns count 0', async () => {
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 0 })

      const result = await service.handleWebhook({})

      expect(result).toEqual({ success: true, duplicate: true })
      expect(repository.markPaymentSuccess).not.toHaveBeenCalled()
    })

    it('returns duplicate when payment already SUCCESS (race condition)', async () => {
      repository.findByGatewayReference
        .mockResolvedValueOnce(paymentRecord)
        .mockResolvedValueOnce({ ...paymentRecord, status: PaymentStatus.SUCCESS })
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 1 })
      repository.markPaymentSuccess.mockResolvedValue({ count: 0 })

      const result = await service.handleWebhook({})

      expect(result).toEqual({ success: true, duplicate: true })
    })

    it('throws ConflictException when markPaymentSuccess fails and not already SUCCESS', async () => {
      repository.findByGatewayReference
        .mockResolvedValueOnce(paymentRecord)
        .mockResolvedValueOnce({ ...paymentRecord, status: PaymentStatus.PENDING })
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 1 })
      repository.markPaymentSuccess.mockResolvedValue({ count: 0 })

      await expect(service.handleWebhook({})).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when markOrderPaid fails', async () => {
      repository.findByGatewayReference.mockResolvedValue(paymentRecord)
      repository.findTransaction.mockResolvedValue(null)
      repository.createTransaction.mockResolvedValue({ count: 1 })
      repository.markPaymentSuccess.mockResolvedValue({ count: 1 })
      repository.markOrderPaid.mockResolvedValue({ count: 0 })

      await expect(service.handleWebhook({})).rejects.toThrow(ConflictException)
    })
  })
})
