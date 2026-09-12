import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderRepository } from './order.repository'
import { CreateOrderBodyDTO } from './order.dto'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async create(userId: number, body: CreateOrderBodyDTO) {
    return this.orderRepository.transaction(async (tx) => {
      const cartItems = await this.orderRepository.getCartForCheckout(tx, userId)

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty')
      }
      for (const item of cartItems) {
        if (item.sku.deletedAt !== null || item.sku.product.deletedAt !== null) {
          throw new BadRequestException(`SKU ${item.skuId} is no longer available`)
        }

        if (item.quantity > item.sku.stock) {
          throw new BadRequestException(`Insufficient stock for SKU ${item.skuId}`)
        }
      }
      const subtotal = cartItems.reduce((total, item) => {
        return total.add(item.sku.price.mul(item.quantity))
      }, new Prisma.Decimal(0))
      const total = subtotal
      for (const item of cartItems) {
        const result = await this.orderRepository.decrementStock(tx, item.skuId, item.quantity)

        if (result.count !== 1) {
          throw new BadRequestException(`Insufficient stock for SKU ${item.skuId}`)
        }
      }
      const order = await this.orderRepository.create(tx, {
        user: {
          connect: {
            id: userId,
          },
        },

        createdBy: {
          connect: {
            id: userId,
          },
        },

        status: OrderStatus.PENDING_PAYMENT,

        receiver: body.receiver,

        subtotal,
        total,

        items: {
          create: cartItems.map((item) => ({
            productName: item.sku.product.name,

            skuPrice: item.sku.price,

            image: item.sku.image,

            skuValue: item.sku.value as Prisma.InputJsonValue,

            quantity: item.quantity,

            sku: {
              connect: {
                id: item.skuId,
              },
            },

            product: {
              connect: {
                id: item.sku.productId,
              },
            },

            productTranslations: item.sku.product.productTranslations,
          })),
        },
      })
      await this.orderRepository.clearCheckedOutItems(
        tx,
        userId,
        cartItems.map((item) => item.id),
      )

      return order
    })
  }

  findMyOrders(userId: number) {
    return this.orderRepository.findManyByUserId(userId)
  }

  async findMyOrderById(userId: number, id: number) {
    const order = await this.orderRepository.findByIdAndUserId(id, userId)

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return order
  }

  async cancel(userId: number, id: number) {
    return this.orderRepository.transaction(async (tx) => {
      const order = await this.orderRepository.findByIdAndUserIdForUpdate(tx, id, userId)

      if (!order) {
        throw new NotFoundException('Order not found')
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('Order cannot be cancelled')
      }

      const result = await this.orderRepository.cancelIfPending(tx, id, userId, userId)

      if (result.count !== 1) {
        throw new BadRequestException('Order cannot be cancelled')
      }

      for (const item of order.items) {
        if (item.skuId === null) {
          continue
        }

        await this.orderRepository.restoreStock(tx, item.skuId, item.quantity)
      }

      return this.orderRepository.findByIdAndUserIdForUpdate(tx, id, userId)
    })
  }
}
