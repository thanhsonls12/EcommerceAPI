import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { InventoryTransactionType, Prisma } from '../../../generated/prisma/client'

type StockRow = {
  stock: number
}

type CreateInventoryTransactionData = {
  skuId: number
  type: InventoryTransactionType
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceType?: string
  referenceId?: number
  note?: string
  createdById?: number
}

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  findSkuById(tx: Prisma.TransactionClient, skuId: number) {
    return tx.sku.findFirst({
      where: {
        id: skuId,
        deletedAt: null,
      },
    })
  }

  async decrementStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    const rows = await tx.$queryRaw<StockRow[]>`
      UPDATE "SKU"
      SET stock = stock - ${quantity},
          "updatedAt" = NOW()
      WHERE id = ${skuId}
        AND "deletedAt" IS NULL
        AND stock >= ${quantity}
      RETURNING stock
    `

    return rows[0] ?? null
  }

  async incrementStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    const rows = await tx.$queryRaw<StockRow[]>`
      UPDATE "SKU"
      SET stock = stock + ${quantity},
          "updatedAt" = NOW()
      WHERE id = ${skuId}
      RETURNING stock
    `

    return rows[0] ?? null
  }

  async adjustStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    const rows = await tx.$queryRaw<StockRow[]>`
      UPDATE "SKU"
      SET stock = stock + ${quantity},
          "updatedAt" = NOW()
      WHERE id = ${skuId}
        AND "deletedAt" IS NULL
        AND stock + ${quantity} >= 0
      RETURNING stock
    `

    return rows[0] ?? null
  }

  createTransaction(tx: Prisma.TransactionClient, data: CreateInventoryTransactionData) {
    return tx.inventoryTransaction.create({
      data,
    })
  }

  findHistoryBySkuId(skuId: number, skip: number, take: number) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        skuId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    })
  }

  countHistoryBySkuId(skuId: number) {
    return this.prisma.inventoryTransaction.count({
      where: {
        skuId,
      },
    })
  }

  findLowStock(threshold: number) {
    return this.prisma.sku.findMany({
      where: {
        deletedAt: null,
        stock: {
          lte: threshold,
        },
      },
      select: {
        id: true,
        value: true,
        stock: true,
        price: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        stock: 'asc',
      },
    })
  }
}
