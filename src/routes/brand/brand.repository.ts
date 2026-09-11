import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BrandUncheckedCreateInput) {
    return this.prisma.brand.create({
      data,
    })
  }

  findById(id: number) {
    return this.prisma.brand.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  findMany() {
    return this.prisma.brand.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  update(id: number, data: Prisma.BrandUncheckedUpdateInput) {
    return this.prisma.brand.update({
      where: { id },
      data,
    })
  }

  countProducts(id: number) {
    return this.prisma.product.count({
      where: {
        brandId: id,
        deletedAt: null,
      },
    })
  }

  softDelete(id: number, deletedById: number) {
    return this.prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById,
      },
    })
  }
}
