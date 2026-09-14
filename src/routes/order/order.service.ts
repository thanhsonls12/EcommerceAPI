import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderRepository } from './order.repository'
import { CreateOrderBodyDTO } from './order.dto'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'
import { MESSAGE } from '@/shared/constants/message.constant'
import { EmailQueueService } from '@/shared/services/email-queue.service'

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async create(userId: number, body: CreateOrderBodyDTO) {
    const order = await this.orderRepository.transaction(async (tx) => {
      const address = await this.orderRepository.findAddressForCheckout(tx, body.addressId, userId)

      if (!address) {
        throw new NotFoundException(MESSAGE.ORDER.ADDRESS_NOT_FOUND)
      }

      const cartItems = await this.orderRepository.getCartForCheckout(tx, userId)

      if (cartItems.length === 0) {
        throw new BadRequestException(MESSAGE.ORDER.CART_EMPTY)
      }
      for (const item of cartItems) {
        if (item.sku.deletedAt !== null || item.sku.product.deletedAt !== null) {
          throw new BadRequestException(MESSAGE.ORDER.SKU_NO_LONGER_AVAILABLE(item.skuId))
        }

        if (item.quantity > item.sku.stock) {
          throw new BadRequestException(MESSAGE.ORDER.INSUFFICIENT_STOCK_FOR_SKU(item.skuId))
        }
      }
      const subtotal = cartItems.reduce((total, item) => {
        return total.add(item.sku.price.mul(item.quantity))
      }, new Prisma.Decimal(0))
      const total = subtotal
      for (const item of cartItems) {
        const result = await this.orderRepository.decrementStock(tx, item.skuId, item.quantity)

        if (result.count !== 1) {
          throw new BadRequestException(MESSAGE.ORDER.INSUFFICIENT_STOCK_FOR_SKU(item.skuId))
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

        receiver: {
          name: address.name,
          phoneNumber: address.phoneNumber,
          address: address.address,
          ...(address.note !== null && {
            note: address.note,
          }),
        },

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

    await this.emailQueueService.addOrderCreated(order.id)

    return order
  }

  findMyOrders(userId: number) {
    return this.orderRepository.findManyByUserId(userId)
  }

  async findMyOrderById(userId: number, id: number) {
    const order = await this.orderRepository.findByIdAndUserId(id, userId)

    if (!order) {
      throw new NotFoundException(MESSAGE.ORDER.NOT_FOUND)
    }

    return order
  }

  async cancel(userId: number, id: number) {
    const order = await this.orderRepository.transaction(async (tx) => {
      const order = await this.orderRepository.findByIdAndUserIdForUpdate(tx, id, userId)

      if (!order) {
        throw new NotFoundException(MESSAGE.ORDER.NOT_FOUND)
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(MESSAGE.ORDER.CANNOT_BE_CANCELLED)
      }

      const result = await this.orderRepository.cancelIfPending(tx, id, userId, userId)

      if (result.count !== 1) {
        throw new BadRequestException(MESSAGE.ORDER.CANNOT_BE_CANCELLED)
      }

      for (const item of order.items) {
        if (item.skuId === null) {
          continue
        }

        await this.orderRepository.restoreStock(tx, item.skuId, item.quantity)
      }

      return this.orderRepository.findByIdAndUserIdForUpdate(tx, id, userId)
    })

    await this.emailQueueService.addOrderCancelled(id)

    return order
  }

  async markPendingDelivery(id: number, userId: number) {
    const order = await this.orderRepository.findById(id)

    if (!order) {
      throw new NotFoundException(MESSAGE.ORDER.NOT_FOUND)
    }

    const result = await this.orderRepository.markPendingDelivery(id, userId)

    if (result.count !== 1) {
      throw new BadRequestException(MESSAGE.ORDER.INVALID_STATUS_TRANSITION)
    }

    const updatedOrder = await this.orderRepository.findById(id)

    await this.emailQueueService.addOrderPendingDelivery(id)

    return updatedOrder
  }

  async markDelivered(id: number, userId: number) {
    const order = await this.orderRepository.findById(id)

    if (!order) {
      throw new NotFoundException(MESSAGE.ORDER.NOT_FOUND)
    }

    const result = await this.orderRepository.markDelivered(id, userId)

    if (result.count !== 1) {
      throw new BadRequestException(MESSAGE.ORDER.INVALID_STATUS_TRANSITION)
    }

    const updatedOrder = await this.orderRepository.findById(id)

    await this.emailQueueService.addOrderDelivered(id)

    return updatedOrder
  }

  async markReturned(id: number, userId: number) {
    const order = await this.orderRepository.findById(id)

    if (!order) {
      throw new NotFoundException(MESSAGE.ORDER.NOT_FOUND)
    }

    const result = await this.orderRepository.markReturned(id, userId)

    if (result.count !== 1) {
      throw new BadRequestException(MESSAGE.ORDER.INVALID_STATUS_TRANSITION)
    }

    const updatedOrder = await this.orderRepository.findById(id)

    await this.emailQueueService.addOrderReturned(id)

    return updatedOrder
  }
}
