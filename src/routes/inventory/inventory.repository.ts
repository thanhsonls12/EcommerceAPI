import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { InventoryTransactionType, Prisma } from '../../../generated/prisma/client'

type StockRow = {
  id: number
  stock: number
}

type StockChange = {
  skuId: number
  quantity: number
}

type AggregatedStockChange = StockChange & {
  ordering: number
  duplicated: boolean
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
      RETURNING id, stock
    `

    return rows[0] ?? null
  }

  async decrementStocks(tx: Prisma.TransactionClient, changes: StockChange[]) {
    return this.applyStockChanges(tx, changes, -1)
  }

  async incrementStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    const rows = await tx.$queryRaw<StockRow[]>`
      UPDATE "SKU"
      SET stock = stock + ${quantity},
          "updatedAt" = NOW()
      WHERE id = ${skuId}
      RETURNING id, stock
    `

    return rows[0] ?? null
  }

  async incrementStocks(tx: Prisma.TransactionClient, changes: StockChange[]) {
    return this.applyStockChanges(tx, changes, 1)
  }

  private aggregateStockChanges(changes: StockChange[]) {
    const bySkuId = new Map<number, AggregatedStockChange>()

    changes.forEach((change, index) => {
      const existing = bySkuId.get(change.skuId)

      if (existing) {
        existing.quantity += change.quantity
        existing.duplicated = true
        return
      }

      bySkuId.set(change.skuId, {
        skuId: change.skuId,
        quantity: change.quantity,
        ordering: index,
        duplicated: false,
      })
    })

    return [...bySkuId.values()].sort((a, b) => a.ordering - b.ordering)
  }

  // Bulk stock movement inside a caller transaction. The rows are locked in a
  // deterministic order to avoid deadlocks, and every requested SKU must be
  // updated for the statement to return, otherwise the caller rolls back.
  private async applyStockChanges(tx: Prisma.TransactionClient, changes: StockChange[], direction: 1 | -1) {
    if (changes.length === 0) {
      return []
    }

    const aggregated = this.aggregateStockChanges(changes)

    // Duplicated SKU ids would collapse into a single locked row, which breaks
    // the "one returned row per requested SKU" contract the callers rely on.
    if (aggregated.some((change) => change.duplicated)) {
      throw new Error('Stock changes must reference each SKU at most once')
    }

    const payload = JSON.stringify(
      aggregated.map((change) => ({
        skuId: change.skuId,
        quantity: change.quantity * direction,
      })),
    )

    return tx.$queryRaw<StockRow[]>`
      WITH requested AS (
        SELECT "skuId", quantity
        FROM jsonb_to_recordset(${payload}::jsonb) AS item("skuId" int, quantity int)
      ),
      filtered AS (
        SELECT requested."skuId", requested.quantity
        FROM requested
        INNER JOIN "SKU" AS sku
          ON sku.id = requested."skuId"
        WHERE sku."deletedAt" IS NULL
          AND sku.stock + requested.quantity >= 0
      ),
      locked AS (
        SELECT sku.id, sku.stock, filtered.quantity
        FROM "SKU" AS sku
        INNER JOIN filtered
          ON filtered."skuId" = sku.id
        ORDER BY sku.id
        FOR UPDATE OF sku
      )
      UPDATE "SKU" AS sku
      SET stock = locked.stock + locked.quantity,
          "updatedAt" = NOW()
      FROM locked
      WHERE sku.id = locked.id
      RETURNING sku.id, sku.stock
    `
  }

  async adjustStock(tx: Prisma.TransactionClient, skuId: number, quantity: number) {
    const rows = await tx.$queryRaw<StockRow[]>`
      UPDATE "SKU"
      SET stock = stock + ${quantity},
          "updatedAt" = NOW()
      WHERE id = ${skuId}
        AND "deletedAt" IS NULL
        AND stock + ${quantity} >= 0
      RETURNING id, stock
    `

    return rows[0] ?? null
  }

  createTransaction(tx: Prisma.TransactionClient, data: CreateInventoryTransactionData) {
    return tx.inventoryTransaction.create({
      data,
    })
  }

  createTransactions(tx: Prisma.TransactionClient, data: CreateInventoryTransactionData[]) {
    if (data.length === 0) {
      return Promise.resolve({ count: 0 })
    }

    return tx.inventoryTransaction.createMany({
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
