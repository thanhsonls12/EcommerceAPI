import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  findByUserId(userId: number) {
    return this.prisma.cartItem.findMany({
      where: {
        userId,
        sku: {
          deletedAt: null,
          product: {
            deletedAt: null,
          },
        },
      },

      select: {
        id: true,
        quantity: true,
        skuId: true,

        sku: {
          select: {
            id: true,
            value: true,
            price: true,
            stock: true,
            image: true,

            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },

        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findItem(userId: number, skuId: number) {
    return this.prisma.cartItem.findUnique({
      where: {
        userId_skuId: {
          userId,
          skuId,
        },
      },
    })
  }

  findItemsForMerge(tx: Prisma.TransactionClient, userId: number, skuIds: number[]) {
    return tx.cartItem.findMany({
      where: {
        userId,
        skuId: { in: skuIds },
      },
      select: {
        skuId: true,
        quantity: true,
      },
    })
  }

  findSkusForMerge(tx: Prisma.TransactionClient, skuIds: number[]) {
    return tx.sku.findMany({
      where: {
        id: { in: skuIds },
        deletedAt: null,
        product: { deletedAt: null },
      },
      select: {
        id: true,
        stock: true,
      },
    })
  }

  setItemQuantity(tx: Prisma.TransactionClient, userId: number, skuId: number, quantity: number) {
    return tx.cartItem.upsert({
      where: {
        userId_skuId: { userId, skuId },
      },
      update: { quantity },
      create: { userId, skuId, quantity },
    })
  }

  upsertItem(userId: number, skuId: number, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: {
        userId_skuId: {
          userId,
          skuId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        userId,
        skuId,
        quantity,
      },
    })
  }

  updateQuantity(userId: number, skuId: number, quantity: number) {
    return this.prisma.cartItem.update({
      where: {
        userId_skuId: {
          userId,
          skuId,
        },
      },
      data: {
        quantity,
      },
    })
  }

  deleteItem(userId: number, skuId: number) {
    return this.prisma.cartItem.delete({
      where: {
        userId_skuId: {
          userId,
          skuId,
        },
      },
    })
  }

  deleteAllByUserId(userId: number) {
    return this.prisma.cartItem.deleteMany({
      where: {
        userId,
      },
    })
  }
}
