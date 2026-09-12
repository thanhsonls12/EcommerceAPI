import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

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
