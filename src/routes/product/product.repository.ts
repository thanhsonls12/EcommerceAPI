import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data,
      include: {
        brand: true,
        categories: true,
      },
    })
  }

  findById(id: number) {
    return this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        brand: true,
        categories: {
          where: {
            deletedAt: null,
          },
        },
      },
    })
  }

  findMany() {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        brand: true,
        categories: {
          where: {
            deletedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  update(id: number, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        brand: true,
        categories: true,
      },
    })
  }

  softDelete(id: number, deletedById: number) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    })
  }
}
