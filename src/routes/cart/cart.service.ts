import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CartRepository } from './cart.repository'
import { SKURepository } from '../product/sku.repository'
import { AddCartItemBodyDTO, UpdateCartItemBodyDTO } from './cart.dto'
import { Prisma } from '../../../generated/prisma/client'

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
      throw new NotFoundException('SKU not found')
    }

    if (sku.stock <= 0) {
      throw new BadRequestException('SKU is out of stock')
    }

    const existingItem = await this.cartRepository.findItem(userId, body.skuId)

    const newQuantity = (existingItem?.quantity ?? 0) + body.quantity

    if (newQuantity > sku.stock) {
      throw new BadRequestException('Quantity exceeds available stock')
    }

    return this.cartRepository.upsertItem(userId, body.skuId, body.quantity)
  }

  async updateItem(userId: number, skuId: number, body: UpdateCartItemBodyDTO) {
    const item = await this.cartRepository.findItem(userId, skuId)

    if (!item) {
      throw new NotFoundException('Cart item not found')
    }

    const sku = await this.skuRepository.findById(skuId)

    if (!sku || sku.product.deletedAt !== null) {
      throw new NotFoundException('SKU not found')
    }

    if (body.quantity > sku.stock) {
      throw new BadRequestException('Quantity exceeds available stock')
    }

    return this.cartRepository.updateQuantity(userId, skuId, body.quantity)
  }

  async deleteItem(userId: number, skuId: number) {
    const item = await this.cartRepository.findItem(userId, skuId)

    if (!item) {
      throw new NotFoundException('Cart item not found')
    }

    await this.cartRepository.deleteItem(userId, skuId)

    return {
      message: 'Cart item deleted successfully',
    }
  }

  async clear(userId: number) {
    await this.cartRepository.deleteAllByUserId(userId)

    return {
      message: 'Cart cleared successfully',
    }
  }
}
