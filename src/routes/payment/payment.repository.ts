import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { OrderStatus, PaymentStatus, Prisma } from '../../../generated/prisma/client'

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  findOrderForPayment(tx: Prisma.TransactionClient, orderId: number, userId: number) {
    return tx.order.findFirst({
      where: {
        id: orderId,
        userId,
        deletedAt: null,
      },
      include: {
        payment: true,
      },
    })
  }

  findByIdAndUserId(paymentId: number, userId: number) {
    return this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: {
          userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        status: true,
        amount: true,
        gateway: true,
        reference: true,
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })
  }

  create(tx: Prisma.TransactionClient, amount: Prisma.Decimal) {
    return tx.payment.create({
      data: {
        status: PaymentStatus.PENDING,
        amount,
      },
    })
  }

  attachPayment(tx: Prisma.TransactionClient, orderId: number, userId: number, paymentId: number) {
    return tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        deletedAt: null,
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: null,
      },

      data: {
        paymentId,
      },
    })
  }

  updateGatewayInfo(paymentId: number, gateway: string, reference: string) {
    return this.prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        gateway,
        reference,
      },
    })
  }

  findByGatewayReference(tx: Prisma.TransactionClient, gateway: string, reference: string) {
    return tx.payment.findFirst({
      where: {
        gateway,
        reference,
      },
      include: {
        order: true,
      },
    })
  }

  findTransaction(tx: Prisma.TransactionClient, gateway: string, referenceNumber: string) {
    return tx.paymentTransaction.findUnique({
      where: {
        gateway_referenceNumber: {
          gateway,
          referenceNumber,
        },
      },
    })
  }

  createTransaction(
    tx: Prisma.TransactionClient,
    data: {
      paymentId: number
      gateway: string
      referenceNumber: string
      amountIn: number
      body: string
    },
  ) {
    return tx.paymentTransaction.createMany({
      data: [data],
      skipDuplicates: true,
    })
  }

  markPaymentSuccess(tx: Prisma.TransactionClient, paymentId: number) {
    return tx.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.SUCCESS,
      },
    })
  }

  markOrderPaid(tx: Prisma.TransactionClient, orderId: number, paymentId: number) {
    return tx.order.updateMany({
      where: {
        id: orderId,
        paymentId,
        status: OrderStatus.PENDING_PAYMENT,
        deletedAt: null,
      },
      data: {
        status: OrderStatus.PENDING_PICKUP,
      },
    })
  }
}
