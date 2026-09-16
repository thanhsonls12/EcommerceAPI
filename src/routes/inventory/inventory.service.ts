import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InventoryRepository } from './inventory.repository'
import { AdjustInventoryBodyDTO, InventoryHistoryQueryDTO } from './inventory.dto'
import { InventoryTransactionType } from '../../../generated/prisma/client'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async adjust(body: AdjustInventoryBodyDTO, userId: number) {
    return this.inventoryRepository.transaction(async (tx) => {
      const sku = await this.inventoryRepository.findSkuById(tx, body.skuId)

      if (!sku) {
        throw new NotFoundException(MESSAGE.INVENTORY.SKU_NOT_FOUND)
      }

      if (body.type === 'RESTOCK' && body.quantity <= 0) {
        throw new BadRequestException(MESSAGE.INVENTORY.INVALID_RESTOCK_QUANTITY)
      }

      if (body.type === 'ADJUSTMENT' && body.quantity === 0) {
        throw new BadRequestException(MESSAGE.INVENTORY.INVALID_ADJUSTMENT_QUANTITY)
      }

      const updated = await this.inventoryRepository.adjustStock(tx, body.skuId, body.quantity)

      if (!updated) {
        throw new BadRequestException(MESSAGE.INVENTORY.INSUFFICIENT_STOCK)
      }

      const stockAfter = updated.stock
      const stockBefore = stockAfter - body.quantity

      const transaction = await this.inventoryRepository.createTransaction(tx, {
        skuId: body.skuId,
        type: body.type === 'RESTOCK' ? InventoryTransactionType.RESTOCK : InventoryTransactionType.ADJUSTMENT,
        quantity: body.quantity,
        stockBefore,
        stockAfter,
        note: body.note,
        createdById: userId,
      })

      return {
        skuId: body.skuId,
        stock: stockAfter,
        transaction,
      }
    })
  }

  async findHistory(skuId: number, query: InventoryHistoryQueryDTO) {
    const skip = (query.page - 1) * query.limit
    const [data, total] = await Promise.all([
      this.inventoryRepository.findHistoryBySkuId(skuId, skip, query.limit),
      this.inventoryRepository.countHistoryBySkuId(skuId),
    ])

    if (total === 0) {
      const sku = await this.inventoryRepository.transaction((tx) => this.inventoryRepository.findSkuById(tx, skuId))

      if (!sku) {
        throw new NotFoundException(MESSAGE.INVENTORY.SKU_NOT_FOUND)
      }
    }

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  findLowStock(threshold: number) {
    return this.inventoryRepository.findLowStock(threshold)
  }
}
