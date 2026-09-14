import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class PromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PromotionCreateInput) {
    return this.prisma.promotion.create({
      data,
    })
  }

  findByCode(code: string) {
    return this.prisma.promotion.findUnique({
      where: {
        code,
      },
    })
  }

  findById(id: number) {
    return this.prisma.promotion.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  findMany() {
    return this.prisma.promotion.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  update(id: number, data: Prisma.PromotionUpdateInput) {
    return this.prisma.promotion.update({
      where: {
        id,
      },
      data,
    })
  }

  softDelete(id: number) {
    return this.prisma.promotion.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })
  }

  findActiveByCode(tx: Prisma.TransactionClient, code: string) {
    return tx.promotion.findFirst({
      where: {
        code,
        deletedAt: null,
        isActive: true,
      },
    })
  }

  findUsageByUser(tx: Prisma.TransactionClient, promotionId: number, userId: number) {
    return tx.couponUsage.findUnique({
      where: {
        promotionId_userId: {
          promotionId,
          userId,
        },
      },
    })
  }

  reserveUsage(tx: Prisma.TransactionClient, promotionId: number, usageLimit: number) {
    return tx.promotion.updateMany({
      where: {
        id: promotionId,
        usedCount: {
          lt: usageLimit,
        },
      },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    })
  }

  incrementUsage(tx: Prisma.TransactionClient, promotionId: number) {
    return tx.promotion.update({
      where: {
        id: promotionId,
      },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    })
  }

  createUsage(
    tx: Prisma.TransactionClient,
    data: {
      promotionId: number
      userId: number
      orderId: number
    },
  ) {
    return tx.couponUsage.create({
      data,
    })
  }

  deleteUsageByOrder(tx: Prisma.TransactionClient, orderId: number, promotionId: number) {
    return tx.couponUsage.deleteMany({
      where: {
        orderId,
        promotionId,
      },
    })
  }

  decrementUsage(tx: Prisma.TransactionClient, promotionId: number) {
    return tx.promotion.updateMany({
      where: {
        id: promotionId,
        usedCount: {
          gt: 0,
        },
      },
      data: {
        usedCount: {
          decrement: 1,
        },
      },
    })
  }
}
