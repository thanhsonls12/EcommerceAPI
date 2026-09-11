import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CategoryUncheckedCreateInput) {
    return this.prisma.category.create({ data })
  }

  countChildren(parentCategoryId: number) {
    return this.prisma.category.count({
      where: {
        parentCategoryId,
        deletedAt: null,
      },
    })
  }

  findById(id: number) {
    return this.prisma.category.findFirst({ where: { id, deletedAt: null } })
  }

  findMany() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        childrenCategories: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findManyByIds(ids: number[]) {
    return this.prisma.category.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })
  }

  findParentId(id: number) {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: {
        parentCategoryId: true,
      },
    })
  }

  update(id: number, data: Prisma.CategoryUncheckedUpdateInput) {
    return this.prisma.category.update({
      where: { id },
      data,
    })
  }

  softDelete(id: number, deletedById: number) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    })
  }
}
