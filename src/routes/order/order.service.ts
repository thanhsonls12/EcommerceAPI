import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderRepository } from './order.repository'
import { CreateOrderBodyDTO } from './order.dto'
import { OrderStatus, Prisma } from '../../../generated/prisma/client'
import { MESSAGE } from '@/shared/constants/message.constant'
import { EmailQueueService } from '@/shared/services/email-queue.service'
import { PromotionRepository } from '../promotion/promotion.repository'

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly promotionRepository: PromotionRepository,
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
      let discount = new Prisma.Decimal(0)
      let couponSnapshot: Prisma.InputJsonValue | undefined
      let promotionId: number | undefined
      if (body.couponCode) {
        const code = body.couponCode.toUpperCase()

        const promotion = await this.promotionRepository.findActiveByCode(tx, code)

        const now = new Date()

        if (!promotion || promotion.startsAt > now || promotion.expiresAt <= now) {
          throw new BadRequestException(MESSAGE.PROMOTION.INVALID_OR_EXPIRED)
        }

        if (promotion.minOrderValue && subtotal.lessThan(promotion.minOrderValue)) {
          throw new BadRequestException(MESSAGE.PROMOTION.MIN_ORDER_NOT_MET)
        }

        const existingUsage = await this.promotionRepository.findUsageByUser(tx, promotion.id, userId)

        if (existingUsage) {
          throw new ConflictException(MESSAGE.PROMOTION.ALREADY_USED)
        }

        if (promotion.type === 'FIXED') {
          discount = Prisma.Decimal.min(promotion.value, subtotal)
        } else {
          discount = subtotal.mul(promotion.value).div(100)

          if (promotion.maxDiscount && discount.greaterThan(promotion.maxDiscount)) {
            discount = promotion.maxDiscount
          }

          discount = Prisma.Decimal.min(discount, subtotal)
        }

        if (promotion.usageLimit !== null) {
          const reserveResult = await this.promotionRepository.reserveUsage(tx, promotion.id, promotion.usageLimit)

          if (reserveResult.count !== 1) {
            throw new ConflictException(MESSAGE.PROMOTION.USAGE_LIMIT_REACHED)
          }
        } else {
          await this.promotionRepository.incrementUsage(tx, promotion.id)
        }

        promotionId = promotion.id

        couponSnapshot = {
          id: promotion.id,
          code: promotion.code,
          name: promotion.name,
          type: promotion.type,
          value: promotion.value.toString(),
          maxDiscount: promotion.maxDiscount?.toString() ?? null,
          discount: discount.toString(),
        }
      }
      const total = subtotal.sub(discount)
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
        discount,
        total,

        ...(couponSnapshot !== undefined && {
          coupon: couponSnapshot,
        }),

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
      if (promotionId !== undefined) {
        try {
          await this.promotionRepository.createUsage(tx, {
            promotionId,
            userId,
            orderId: order.id,
          })
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException(MESSAGE.PROMOTION.ALREADY_USED)
          }
          throw error
        }
      }
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

      if (order.couponUsage) {
        const deletedUsage = await this.promotionRepository.deleteUsageByOrder(
          tx,
          id,
          order.couponUsage.promotionId,
        )

        if (deletedUsage.count === 1) {
          const decrementedUsage = await this.promotionRepository.decrementUsage(
            tx,
            order.couponUsage.promotionId,
          )

          if (decrementedUsage.count !== 1) {
            throw new Error('Promotion usage count is inconsistent')
          }
        }
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
