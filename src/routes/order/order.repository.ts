import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
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

  decrementStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    return tx.sku.updateMany({
      where: {
        id: skuId,
        deletedAt: null,
        stock: {
          gte: quantity,
        },
      },

      data: {
        stock: {
          decrement: quantity,
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
      },
    })
  }

  restoreStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    return tx.sku.update({
      where: {
        id: skuId,
      },

      data: {
        stock: {
          increment: quantity,
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
}
