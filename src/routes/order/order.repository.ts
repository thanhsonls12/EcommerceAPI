import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  findAddressForCheckout(tx: Prisma.TransactionClient, addressId: number, userId: number) {
    return tx.address.findFirst({
      where: {
        id: addressId,
        userId,
        deletedAt: null,
      },
    })
  }

  getCartForCheckout(tx: Prisma.TransactionClient, userId: number) {
    return tx.cartItem.findMany({
      where: {
        userId,
      },

      include: {
        sku: {
          include: {
            product: {
              include: {
                productTranslations: {
                  where: {
                    deletedAt: null,
                  },
                  select: {
                    languageId: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  create(tx: Prisma.TransactionClient, data: Prisma.OrderCreateInput) {
    return tx.order.create({
      data,

      include: {
        items: true,
      },
    })
  }

  clearCheckedOutItems(tx: Prisma.TransactionClient, userId: number, itemIds: number[]) {
    return tx.cartItem.deleteMany({
      where: {
        userId,
        id: {
          in: itemIds,
        },
      },
    })
  }

  findManyByUserId(userId: number) {
    return this.prisma.order.findMany({
      where: {
        userId,
        deletedAt: null,
      },

      include: {
        items: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findByIdAndUserId(id: number, userId: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },

      include: {
        items: true,
      },
    })
  }

  findByIdAndUserIdForUpdate(tx: Prisma.TransactionClient, id: number, userId: number) {
    return tx.order.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },

      include: {
        items: true,
        couponUsage: {
          select: {
            promotionId: true,
          },
        },
      },
    })
  }

  findById(id: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    })
  }

  findByIdForUpdate(tx: Prisma.TransactionClient, id: number) {
    return tx.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    })
  }

  findByIdForEmail(id: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })
  }

  cancelIfPending(tx: Prisma.TransactionClient, id: number, userId: number, updatedById: number) {
    return tx.order.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
        status: OrderStatus.PENDING_PAYMENT,
      },

      data: {
        status: OrderStatus.CANCELLED,
        updatedById,
      },
    })
  }

  markPendingDelivery(id: number, updatedById: number) {
    return this.prisma.order.updateMany({
      where: {
        id,
        deletedAt: null,
        status: OrderStatus.PENDING_PICKUP,
      },
      data: {
        status: OrderStatus.PENDING_DELIVERY,
        updatedById,
      },
    })
  }

  markDelivered(id: number, updatedById: number) {
    return this.prisma.order.updateMany({
      where: {
        id,
        deletedAt: null,
        status: OrderStatus.PENDING_DELIVERY,
      },
      data: {
        status: OrderStatus.DELIVERED,
        updatedById,
      },
    })
  }

  markReturned(tx: Prisma.TransactionClient, id: number, updatedById: number) {
    return tx.order.updateMany({
      where: {
        id,
        deletedAt: null,
        status: OrderStatus.DELIVERED,
      },
      data: {
        status: OrderStatus.RETURNED,
        updatedById,
      },
    })
  }
}
