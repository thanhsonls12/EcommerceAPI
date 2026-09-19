import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CartRepository } from './cart.repository'
import { SKURepository } from '../product/sku.repository'
import { AddCartItemBodyDTO, MergeCartBodyDTO, UpdateCartItemBodyDTO } from './cart.dto'
import { Prisma } from '../../../generated/prisma/client'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly skuRepository: SKURepository,
  ) {}

  async findMyCart(userId: number) {
    const items = await this.cartRepository.findByUserId(userId)

    const data = items.map((item) => ({
      ...item,
      lineTotal: item.sku.price.mul(item.quantity),
    }))

    const totalPrice = data.reduce((total, item) => total.add(item.lineTotal), new Prisma.Decimal(0))

    return {
      items: data,
      summary: {
        totalItems: data.reduce((total, item) => total + item.quantity, 0),
        totalPrice,
      },
    }
  }

  async addItem(userId: number, body: AddCartItemBodyDTO) {
    const sku = await this.skuRepository.findById(body.skuId)

    if (!sku || sku.product.deletedAt !== null) {
      throw new NotFoundException(MESSAGE.CART.SKU_NOT_FOUND)
    }

    if (sku.stock <= 0) {
      throw new BadRequestException(MESSAGE.CART.SKU_OUT_OF_STOCK)
    }

    const existingItem = await this.cartRepository.findItem(userId, body.skuId)

    const newQuantity = (existingItem?.quantity ?? 0) + body.quantity

    if (newQuantity > sku.stock) {
      throw new BadRequestException(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK)
    }

    return this.cartRepository.upsertItem(userId, body.skuId, body.quantity)
  }

  async merge(userId: number, body: MergeCartBodyDTO) {
    if (body.items.length === 0) {
      return {
        cart: await this.findMyCart(userId),
        adjustments: [],
      }
    }

    const adjustments = await this.cartRepository.transaction(async (tx) => {
      const skuIds = body.items.map((item) => item.skuId)
      const [skus, existingItems] = await Promise.all([
        this.cartRepository.findSkusForMerge(tx, skuIds),
        this.cartRepository.findItemsForMerge(tx, userId, skuIds),
      ])
      const skuById = new Map(skus.map((sku) => [sku.id, sku]))
      const existingBySkuId = new Map(existingItems.map((item) => [item.skuId, item.quantity]))
      const results: Array<{
        skuId: number
        requested: number
        merged: number
        reason?: 'UNAVAILABLE' | 'STOCK_LIMIT'
      }> = []

      for (const item of body.items) {
        const sku = skuById.get(item.skuId)
        if (!sku || sku.stock <= 0) {
          results.push({ skuId: item.skuId, requested: item.quantity, merged: 0, reason: 'UNAVAILABLE' })
          continue
        }

        const desired = Math.max(existingBySkuId.get(item.skuId) ?? 0, item.quantity)
        const merged = Math.min(desired, sku.stock)
        await this.cartRepository.setItemQuantity(tx, userId, item.skuId, merged)
        results.push({
          skuId: item.skuId,
          requested: item.quantity,
          merged,
          ...(merged < desired ? { reason: 'STOCK_LIMIT' as const } : {}),
        })
      }

      return results
    })

    return {
      cart: await this.findMyCart(userId),
      adjustments,
    }
  }

  async updateItem(userId: number, skuId: number, body: UpdateCartItemBodyDTO) {
    const item = await this.cartRepository.findItem(userId, skuId)

    if (!item) {
      throw new NotFoundException(MESSAGE.CART.ITEM_NOT_FOUND)
    }

    const sku = await this.skuRepository.findById(skuId)

    if (!sku || sku.product.deletedAt !== null) {
      throw new NotFoundException(MESSAGE.CART.SKU_NOT_FOUND)
    }

    if (body.quantity > sku.stock) {
      throw new BadRequestException(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK)
    }

    return this.cartRepository.updateQuantity(userId, skuId, body.quantity)
  }

  async deleteItem(userId: number, skuId: number) {
    const item = await this.cartRepository.findItem(userId, skuId)

    if (!item) {
      throw new NotFoundException(MESSAGE.CART.ITEM_NOT_FOUND)
    }

    await this.cartRepository.deleteItem(userId, skuId)

    return {
      message: MESSAGE.CART.ITEM_DELETED_SUCCESSFULLY,
    }
  }

  async clear(userId: number) {
    await this.cartRepository.deleteAllByUserId(userId)

    return {
      message: MESSAGE.CART.CLEARED_SUCCESSFULLY,
    }
  }
}
