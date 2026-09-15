import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus } from '../../../generated/prisma/client'
import { PaymentRepository } from './payment.repository'
import { CreatePaymentBodyDTO } from './payment.dto'
import * as paymentGatewayInterface from './gateways/payment-gateway.interface'
import { MESSAGE } from '@/shared/constants/message.constant'
import { EmailQueueService } from '@/shared/services/email-queue.service'
import { RealtimeService } from '../realtime/realtime.service'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    @Inject(paymentGatewayInterface.PAYMENT_GATEWAY)
    private readonly paymentGateway: paymentGatewayInterface.PaymentGateway,
    private readonly emailQueueService: EmailQueueService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(userId: number, body: CreatePaymentBodyDTO) {
    const { payment, order } = await this.paymentRepository.transaction(async (tx) => {
      const order = await this.paymentRepository.findOrderForPayment(tx, body.orderId, userId)
      if (!order) {
        throw new NotFoundException(MESSAGE.PAYMENT.ORDER_NOT_FOUND)
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(MESSAGE.PAYMENT.ORDER_NOT_AWAITING_PAYMENT)
      }

      if (order.payment) {
        if (order.payment.status !== PaymentStatus.PENDING) {
          throw new ConflictException(MESSAGE.PAYMENT.PAYMENT_CANNOT_BE_RETRIED)
        }
        return {
          payment: order.payment,
          order,
        }
      }

      const payment = await this.paymentRepository.create(tx, order.total)

      const result = await this.paymentRepository.attachPayment(tx, order.id, userId, payment.id)

      if (result.count !== 1) {
        throw new ConflictException(MESSAGE.PAYMENT.PAYMENT_COULD_NOT_BE_CREATED)
      }

      return {
        payment,
        order,
      }
    })

    const gatewayResult = await this.paymentGateway.createPayment({
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(payment.amount),
      description: `Order ${order.id} payment`,
    })

    await this.paymentRepository.updateGatewayInfo(
      payment.id,
      this.paymentGateway.name,
      gatewayResult.providerReference,
    )

    return {
      paymentId: payment.id,
      checkoutUrl: gatewayResult.checkoutUrl,
    }
  }

  async handleWebhook(payload: unknown) {
    const webhook = await this.paymentGateway.verifyWebhook(payload)

    const result = await this.paymentRepository.transaction(async (tx) => {
      const payment = await this.paymentRepository.findByGatewayReference(
        tx,
        this.paymentGateway.name,
        webhook.paymentReference,
      )

      if (!payment || !payment.order) {
        throw new NotFoundException(MESSAGE.PAYMENT.PAYMENT_NOT_FOUND)
      }

      const existingTransaction = await this.paymentRepository.findTransaction(
        tx,
        this.paymentGateway.name,
        webhook.transactionReference,
      )

      if (existingTransaction) {
        return {
          success: true,
          duplicate: true,
          shouldNotify: false,
        }
      }

      if (!payment.amount.equals(webhook.amount)) {
        throw new BadRequestException(MESSAGE.PAYMENT.PAYMENT_AMOUNT_MISMATCH)
      }

      const transactionResult = await this.paymentRepository.createTransaction(tx, {
        paymentId: payment.id,
        gateway: this.paymentGateway.name,
        referenceNumber: webhook.transactionReference,
        amountIn: webhook.amount,
        body: JSON.stringify(webhook.rawBody),
      })

      if (transactionResult.count === 0) {
        return {
          success: true,
          duplicate: true,
          shouldNotify: false,
        }
      }

      if (!webhook.success) {
        return {
          success: true,
          duplicate: false,
          shouldNotify: false,
        }
      }

      const paymentResult = await this.paymentRepository.markPaymentSuccess(tx, payment.id)

      if (paymentResult.count !== 1) {
        const currentPayment = await this.paymentRepository.findByGatewayReference(
          tx,
          this.paymentGateway.name,
          webhook.paymentReference,
        )

        if (currentPayment?.status === PaymentStatus.SUCCESS) {
          return {
            success: true,
            duplicate: true,
            shouldNotify: false,
          }
        }

        throw new ConflictException(MESSAGE.PAYMENT.PAYMENT_STATUS_CANNOT_BE_UPDATED)
      }

      const orderResult = await this.paymentRepository.markOrderPaid(tx, payment.order.id, payment.id)

      if (orderResult.count !== 1) {
        throw new ConflictException(MESSAGE.PAYMENT.ORDER_STATUS_CANNOT_BE_UPDATED)
      }

      return {
        success: true,
        duplicate: false,
        shouldNotify: true,
        orderId: payment.order.id,
        userId: payment.order.userId,
      }
    })
    if (result.shouldNotify && result.orderId !== undefined && result.userId !== undefined) {
      await this.emailQueueService.addOrderPaid(result.orderId)
      this.realtimeService.orderPaid(result.userId, result.orderId)
      this.realtimeService.orderUpdated(result.userId, {
        orderId: result.orderId,
        status: OrderStatus.PENDING_PICKUP,
      })
    }
    return {
      success: result.success,
      duplicate: result.duplicate,
    }
  }
}
