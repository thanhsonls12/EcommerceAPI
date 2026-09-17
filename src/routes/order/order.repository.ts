import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'

type OrderItem = Prisma.ProductSKUSnapshotGetPayload<Record<string, never>>

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  // Aggregate the order lines per SKU so callers can settle inventory in one
  // statement: a null skuId means the SKU row was deleted, and the totals are
  // the only place a bug in the order lines would show up.
  private sumQuantitiesBySkuId(items: OrderItem[]) {
    const quantities = new Map<number, number>()

    for (const item of items) {
      if (item.skuId === null) {
        continue
      }

      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Order item has an invalid quantity')
      }

      quantities.set(item.skuId, (quantities.get(item.skuId) ?? 0) + item.quantity)
    }

    return quantities
  }

  // Rebuild the stock ledger from the order lines: the stock after the movement
  // is known from the current level, so walking the totals backwards restores
  // the exact level recorded when the order was created.
  buildInventoryReversal(items: OrderItem[], stockAfterBySkuId: Map<number, number>) {
    const rows: {
      skuId: number
      quantity: number
      stockBefore: number
      stockAfter: number
    }[] = []

    for (const [skuId, quantity] of this.sumQuantitiesBySkuId(items)) {
      const stockAfter = stockAfterBySkuId.get(skuId)

      if (stockAfter === undefined) {
        throw new Error(`SKU ${skuId} no longer exists while restoring inventory`)
      }

      rows.push({
        skuId,
        quantity,
        stockBefore: stockAfter - quantity,
        stockAfter,
      })
    }

    return rows
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

  findManyByUserId(userId: number, skip: number, take: number) {
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
      skip,
      take,
    })
  }

  countByUserId(userId: number) {
    return this.prisma.order.count({
      where: {
        userId,
        deletedAt: null,
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
