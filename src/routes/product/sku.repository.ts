import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class SKURepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.SkuCreateInput) {
    return this.prisma.sku.create({
      data,
    })
  }

  countActiveByProductId(productId: number) {
    return this.prisma.sku.count({
      where: {
        productId,
        deletedAt: null,
      },
    })
  }

  findManyByProductId(productId: number) {
    return this.prisma.sku.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findByIdAndProductId(id: number, productId: number) {
    return this.prisma.sku.findFirst({
      where: {
        id,
        productId,
        deletedAt: null,
      },
    })
  }

  update(id: number, data: Prisma.SkuUpdateInput) {
    return this.prisma.sku.update({
      where: {
        id,
      },
      data,
    })
  }

  softDelete(id: number, deletedById: number) {
    return this.prisma.sku.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        deletedById,
      },
    })
  }
}
