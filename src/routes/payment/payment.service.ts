import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus } from '../../../generated/prisma/client'
import { PaymentRepository } from './payment.repository'
import { CreatePaymentBodyDTO } from './payment.dto'
import * as paymentGatewayInterface from './gateways/payment-gateway.interface'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    @Inject(paymentGatewayInterface.PAYMENT_GATEWAY)
    private readonly paymentGateway: paymentGatewayInterface.PaymentGateway,
  ) {}

  async create(userId: number, body: CreatePaymentBodyDTO) {
    const { payment, order } = await this.paymentRepository.transaction(async (tx) => {
      const order = await this.paymentRepository.findOrderForPayment(tx, body.orderId, userId)
      if (!order) {
        throw new NotFoundException('Order not found')
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException('Order is not awaiting payment')
      }

      if (order.payment) {
        if (order.payment.status !== PaymentStatus.PENDING) {
          throw new ConflictException('Payment cannot be retried')
        }
        return {
          payment: order.payment,
          order,
        }
      }

      const payment = await this.paymentRepository.create(tx, order.total)

      const result = await this.paymentRepository.attachPayment(tx, order.id, userId, payment.id)

      if (result.count !== 1) {
        throw new ConflictException('Payment could not be created for this order')
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

    return this.paymentRepository.transaction(async (tx) => {
      const payment = await this.paymentRepository.findByGatewayReference(
        tx,
        this.paymentGateway.name,
        webhook.paymentReference,
      )

      if (!payment || !payment.order) {
        throw new NotFoundException('Payment not found')
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
        }
      }

      if (!payment.amount.equals(webhook.amount)) {
        throw new BadRequestException('Payment amount mismatch')
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
        }
      }

      if (!webhook.success) {
        return {
          success: true,
          duplicate: false,
        }
      }

      const paymentResult = await this.paymentRepository.markPaymentSuccess(tx, payment.id)

      if (paymentResult.count !== 1) {
        if (payment.status === PaymentStatus.SUCCESS) {
          return {
            success: true,
            duplicate: true,
          }
        }

        throw new ConflictException('Payment status cannot be updated')
      }

      const orderResult = await this.paymentRepository.markOrderPaid(tx, payment.order.id, payment.id)

      if (orderResult.count !== 1) {
        throw new ConflictException('Order status cannot be updated')
      }

      return {
        success: true,
        duplicate: false,
      }
    })
  }
}
