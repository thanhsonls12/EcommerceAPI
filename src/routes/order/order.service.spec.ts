// `@nestjs/bullmq` ships as ESM and is not transformed by ts-jest inside node_modules.
// OrderService pulls it in transitively via EmailQueueService, so stub the decorator/token
// it exposes. EmailQueueService itself is replaced by a mock provider below.
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  getQueueToken: (name?: string) => `BullQueue_${name ?? ''}`,
}))

import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { OrderService } from './order.service'
import { OrderRepository } from './order.repository'
import { EmailQueueService } from '@/shared/services/email-queue.service'
import { PromotionRepository } from '../promotion/promotion.repository'
import { InventoryRepository } from '../inventory/inventory.repository'
import { RealtimeService } from '../realtime/realtime.service'
import { NotificationService } from '../notification/notification.service'
import { InventoryTransactionType, NotificationType, OrderStatus, Prisma } from '../../../generated/prisma/client'

describe('OrderService', () => {
  let service: OrderService

  const orderRepository = {
    transaction: jest.fn(),
    findAddressForCheckout: jest.fn(),
    getCartForCheckout: jest.fn(),
    create: jest.fn(),
    clearCheckedOutItems: jest.fn(),
    findManyByUserId: jest.fn(),
    findByIdAndUserId: jest.fn(),
    findByIdAndUserIdForUpdate: jest.fn(),
    findById: jest.fn(),
    findByIdForUpdate: jest.fn(),
    cancelIfPending: jest.fn(),
    markPendingDelivery: jest.fn(),
    markDelivered: jest.fn(),
    markReturned: jest.fn(),
  }

  const emailQueueService = {
    addOrderCreated: jest.fn(),
    addOrderCancelled: jest.fn(),
    addOrderPendingDelivery: jest.fn(),
    addOrderDelivered: jest.fn(),
    addOrderReturned: jest.fn(),
  }

  const promotionRepository = {
    findActiveByCode: jest.fn(),
    findUsageByUser: jest.fn(),
    reserveUsage: jest.fn(),
    incrementUsage: jest.fn(),
    createUsage: jest.fn(),
    deleteUsageByOrder: jest.fn(),
    decrementUsage: jest.fn(),
  }

  const inventoryRepository = {
    decrementStock: jest.fn(),
    incrementStock: jest.fn(),
    createTransaction: jest.fn(),
  }

  const realtimeService = {
    orderCancelled: jest.fn(),
    orderUpdated: jest.fn(),
  }

  const notificationService = {
    create: jest.fn(),
  }

  const USER_ID = 1
  const ORDER_ID = 100

  // Cart: 100000 x 2 + 50000 x 1 = 250000
  const buildCartItems = () => [
    {
      id: 501,
      skuId: 10,
      quantity: 2,
      userId: USER_ID,
      sku: {
        deletedAt: null,
        stock: 5,
        price: new Prisma.Decimal(100000),
        image: 'sku-10.png',
        value: { color: 'red' },
        productId: 900,
        product: {
          deletedAt: null,
          name: 'Product A',
          productTranslations: [],
        },
      },
    },
    {
      id: 502,
      skuId: 11,
      quantity: 1,
      userId: USER_ID,
      sku: {
        deletedAt: null,
        stock: 3,
        price: new Prisma.Decimal(50000),
        image: 'sku-11.png',
        value: { color: 'blue' },
        productId: 901,
        product: {
          deletedAt: null,
          name: 'Product B',
          productTranslations: [],
        },
      },
    },
  ]

  const validAddress = {
    id: 20,
    userId: USER_ID,
    name: 'Nguyen Van A',
    phoneNumber: '0900000000',
    address: '123 Le Loi',
    note: 'Leave at door',
    deletedAt: null,
  }

  const createdOrder = {
    id: ORDER_ID,
    items: [
      { skuId: 10, quantity: 2 },
      { skuId: 11, quantity: 1 },
    ],
  }

  const percentPromotion = {
    id: 5,
    code: 'SAVE20',
    name: 'Save 20%',
    type: 'PERCENT' as const,
    value: new Prisma.Decimal(20),
    minOrderValue: null,
    maxDiscount: new Prisma.Decimal(100000),
    usageLimit: 100,
    startsAt: new Date('2020-01-01T00:00:00.000Z'),
    expiresAt: new Date('2999-01-01T00:00:00.000Z'),
  }

  const fixedPromotion = {
    ...percentPromotion,
    code: 'FLAT30',
    name: 'Flat 30k',
    type: 'FIXED' as const,
    value: new Prisma.Decimal(30000),
    maxDiscount: null,
  }

  const getCreateArg = () =>
    orderRepository.create.mock.calls[0][1] as {
      subtotal: Prisma.Decimal
      discount: Prisma.Decimal
      total: Prisma.Decimal
      status: OrderStatus
      coupon?: unknown
    }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: EmailQueueService, useValue: emailQueueService },
        { provide: PromotionRepository, useValue: promotionRepository },
        { provide: InventoryRepository, useValue: inventoryRepository },
        { provide: RealtimeService, useValue: realtimeService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile()

    service = moduleRef.get(OrderService)

    jest.clearAllMocks()

    // Run the transaction callback immediately with a dummy tx client.
    orderRepository.transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb({}))
    inventoryRepository.decrementStock.mockResolvedValue({ stock: 1 })
    inventoryRepository.incrementStock.mockResolvedValue({ stock: 9 })
    inventoryRepository.createTransaction.mockResolvedValue(undefined)
    orderRepository.create.mockResolvedValue(createdOrder)
  })

  describe('create', () => {
    it('creates an order without a coupon and computes subtotal/total', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())

      const result = await service.create(USER_ID, { addressId: validAddress.id })

      const arg = getCreateArg()
      expect(arg.subtotal.toString()).toBe('250000')
      expect(arg.discount.toString()).toBe('0')
      expect(arg.total.toString()).toBe('250000')
      expect(arg.status).toBe(OrderStatus.PENDING_PAYMENT)
      expect(arg.coupon).toBeUndefined()

      // Stock decremented + a SALE ledger entry per cart item
      expect(inventoryRepository.decrementStock).toHaveBeenCalledTimes(2)
      expect(inventoryRepository.createTransaction).toHaveBeenCalledTimes(2)
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: InventoryTransactionType.SALE, referenceId: ORDER_ID }),
      )

      // Cart cleared for exactly the checked-out items, email queued
      expect(orderRepository.clearCheckedOutItems).toHaveBeenCalledWith(expect.anything(), USER_ID, [501, 502])
      expect(emailQueueService.addOrderCreated).toHaveBeenCalledWith(ORDER_ID)
      expect(promotionRepository.findActiveByCode).not.toHaveBeenCalled()
      expect(result).toEqual(createdOrder)
    })

    it('throws when the shipping address is not found', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(null)

      await expect(service.create(USER_ID, { addressId: 999 })).rejects.toThrow(NotFoundException)
      expect(orderRepository.getCartForCheckout).not.toHaveBeenCalled()
      expect(orderRepository.create).not.toHaveBeenCalled()
    })

    it('throws when the cart is empty', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue([])

      await expect(service.create(USER_ID, { addressId: validAddress.id })).rejects.toThrow('Cart is empty')
      expect(orderRepository.create).not.toHaveBeenCalled()
    })

    it('throws when a cart SKU is no longer available', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      const items = buildCartItems()
      items[0].sku.deletedAt = new Date() as unknown as null
      orderRepository.getCartForCheckout.mockResolvedValue(items)

      await expect(service.create(USER_ID, { addressId: validAddress.id })).rejects.toThrow(
        'SKU 10 is no longer available',
      )
      expect(inventoryRepository.decrementStock).not.toHaveBeenCalled()
    })

    it('throws when requested quantity exceeds available stock', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      const items = buildCartItems()
      items[0].quantity = 999
      orderRepository.getCartForCheckout.mockResolvedValue(items)

      await expect(service.create(USER_ID, { addressId: validAddress.id })).rejects.toThrow(
        'Insufficient stock for SKU 10',
      )
      expect(orderRepository.create).not.toHaveBeenCalled()
    })

    it('applies a FIXED coupon and records usage via reserveUsage', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue(fixedPromotion)
      promotionRepository.findUsageByUser.mockResolvedValue(null)
      promotionRepository.reserveUsage.mockResolvedValue({ count: 1 })
      promotionRepository.createUsage.mockResolvedValue(undefined)

      await service.create(USER_ID, { addressId: validAddress.id, couponCode: 'flat30' })

      // Coupon code is normalized to uppercase before lookup
      expect(promotionRepository.findActiveByCode).toHaveBeenCalledWith(expect.anything(), 'FLAT30')

      const arg = getCreateArg()
      expect(arg.discount.toString()).toBe('30000')
      expect(arg.total.toString()).toBe('220000')
      expect(promotionRepository.reserveUsage).toHaveBeenCalledWith(expect.anything(), fixedPromotion.id, 100)
      expect(promotionRepository.createUsage).toHaveBeenCalledWith(expect.anything(), {
        promotionId: fixedPromotion.id,
        userId: USER_ID,
        orderId: ORDER_ID,
      })
    })

    it('caps a PERCENT coupon discount at maxDiscount', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue({
        ...percentPromotion,
        maxDiscount: new Prisma.Decimal(30000),
      })
      promotionRepository.findUsageByUser.mockResolvedValue(null)
      promotionRepository.reserveUsage.mockResolvedValue({ count: 1 })
      promotionRepository.createUsage.mockResolvedValue(undefined)

      await service.create(USER_ID, { addressId: validAddress.id, couponCode: 'SAVE20' })

      const arg = getCreateArg()
      // 20% of 250000 = 50000, capped at maxDiscount 30000
      expect(arg.discount.toString()).toBe('30000')
      expect(arg.total.toString()).toBe('220000')
    })

    it('throws when the coupon is invalid or expired', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue({
        ...percentPromotion,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      })

      await expect(service.create(USER_ID, { addressId: validAddress.id, couponCode: 'SAVE20' })).rejects.toThrow(
        'Promotion is invalid or expired',
      )
      expect(orderRepository.create).not.toHaveBeenCalled()
    })

    it('throws when the order does not meet the coupon minimum value', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue({
        ...percentPromotion,
        minOrderValue: new Prisma.Decimal(500000),
      })

      await expect(service.create(USER_ID, { addressId: validAddress.id, couponCode: 'SAVE20' })).rejects.toThrow(
        'Order does not meet the minimum value for this promotion',
      )
    })

    it('throws when the coupon was already used by the user', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue(percentPromotion)
      promotionRepository.findUsageByUser.mockResolvedValue({ id: 1 })

      await expect(service.create(USER_ID, { addressId: validAddress.id, couponCode: 'SAVE20' })).rejects.toThrow(
        'Promotion has already been used by this user',
      )
      expect(promotionRepository.reserveUsage).not.toHaveBeenCalled()
    })

    it('throws when the coupon usage limit is exhausted (reserve race lost)', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue(percentPromotion)
      promotionRepository.findUsageByUser.mockResolvedValue(null)
      promotionRepository.reserveUsage.mockResolvedValue({ count: 0 })

      await expect(service.create(USER_ID, { addressId: validAddress.id, couponCode: 'SAVE20' })).rejects.toThrow(
        'Promotion usage limit has been reached',
      )
      expect(orderRepository.create).not.toHaveBeenCalled()
    })

    it('throws when stock is depleted between validation and decrement (race)', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      inventoryRepository.decrementStock.mockResolvedValueOnce(null)

      await expect(service.create(USER_ID, { addressId: validAddress.id })).rejects.toThrow(
        'Insufficient stock for SKU 10',
      )
    })

    it('maps a unique-constraint violation on coupon usage to a conflict', async () => {
      orderRepository.findAddressForCheckout.mockResolvedValue(validAddress)
      orderRepository.getCartForCheckout.mockResolvedValue(buildCartItems())
      promotionRepository.findActiveByCode.mockResolvedValue({ ...fixedPromotion, usageLimit: null })
      promotionRepository.findUsageByUser.mockResolvedValue(null)
      promotionRepository.incrementUsage.mockResolvedValue({ count: 1 })
      promotionRepository.createUsage.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7.0.0' }),
      )

      await expect(service.create(USER_ID, { addressId: validAddress.id, couponCode: 'FLAT30' })).rejects.toThrow(
        'Promotion has already been used by this user',
      )
    })
  })

  describe('findMyOrders', () => {
    it('delegates to the repository', async () => {
      const orders = [{ id: 1 }, { id: 2 }]
      orderRepository.findManyByUserId.mockResolvedValue(orders)

      await expect(service.findMyOrders(USER_ID)).resolves.toEqual(orders)
      expect(orderRepository.findManyByUserId).toHaveBeenCalledWith(USER_ID)
    })
  })

  describe('findMyOrderById', () => {
    it('returns the order when it belongs to the user', async () => {
      const order = { id: ORDER_ID, userId: USER_ID }
      orderRepository.findByIdAndUserId.mockResolvedValue(order)

      await expect(service.findMyOrderById(USER_ID, ORDER_ID)).resolves.toEqual(order)
    })

    it('throws when the order is not found', async () => {
      orderRepository.findByIdAndUserId.mockResolvedValue(null)

      await expect(service.findMyOrderById(USER_ID, ORDER_ID)).rejects.toThrow('Order not found')
    })
  })

  describe('cancel', () => {
    const pendingOrder = {
      id: ORDER_ID,
      userId: USER_ID,
      status: OrderStatus.PENDING_PAYMENT,
      items: [
        { skuId: 10, quantity: 2 },
        { skuId: 11, quantity: 1 },
      ],
      couponUsage: { promotionId: 5 },
    }

    it('cancels a pending order, restores stock and releases the coupon', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue(pendingOrder)
      orderRepository.cancelIfPending.mockResolvedValue({ count: 1 })
      promotionRepository.deleteUsageByOrder.mockResolvedValue({ count: 1 })
      promotionRepository.decrementUsage.mockResolvedValue({ count: 1 })

      await service.cancel(USER_ID, ORDER_ID)

      expect(inventoryRepository.incrementStock).toHaveBeenCalledTimes(2)
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: InventoryTransactionType.RESTORE }),
      )
      expect(promotionRepository.deleteUsageByOrder).toHaveBeenCalledWith(expect.anything(), ORDER_ID, 5)
      expect(promotionRepository.decrementUsage).toHaveBeenCalledWith(expect.anything(), 5)
      expect(emailQueueService.addOrderCancelled).toHaveBeenCalledWith(ORDER_ID)
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, type: NotificationType.ORDER }),
      )
      expect(realtimeService.orderCancelled).toHaveBeenCalledWith(USER_ID, ORDER_ID)
    })

    it('throws when the order is not found', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue(null)

      await expect(service.cancel(USER_ID, ORDER_ID)).rejects.toThrow('Order not found')
      expect(orderRepository.cancelIfPending).not.toHaveBeenCalled()
    })

    it('throws when the order is not in a cancellable status', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.DELIVERED,
      })

      await expect(service.cancel(USER_ID, ORDER_ID)).rejects.toThrow('Order cannot be cancelled')
      expect(orderRepository.cancelIfPending).not.toHaveBeenCalled()
    })

    it('throws when the conditional cancel affects no rows (lost race)', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue(pendingOrder)
      orderRepository.cancelIfPending.mockResolvedValue({ count: 0 })

      await expect(service.cancel(USER_ID, ORDER_ID)).rejects.toThrow('Order cannot be cancelled')
      expect(inventoryRepository.incrementStock).not.toHaveBeenCalled()
    })

    it('throws when a SKU no longer exists while restoring inventory', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue(pendingOrder)
      orderRepository.cancelIfPending.mockResolvedValue({ count: 1 })
      inventoryRepository.incrementStock.mockResolvedValueOnce(null)

      await expect(service.cancel(USER_ID, ORDER_ID)).rejects.toThrow(
        'SKU no longer exists while restoring inventory',
      )

      expect(inventoryRepository.createTransaction).not.toHaveBeenCalled()
      expect(emailQueueService.addOrderCancelled).not.toHaveBeenCalled()
      expect(notificationService.create).not.toHaveBeenCalled()
      expect(realtimeService.orderCancelled).not.toHaveBeenCalled()
    })

    it('throws when promotion usage count is inconsistent during cancellation', async () => {
      orderRepository.findByIdAndUserIdForUpdate.mockResolvedValue(pendingOrder)
      orderRepository.cancelIfPending.mockResolvedValue({ count: 1 })
      promotionRepository.deleteUsageByOrder.mockResolvedValue({ count: 1 })
      promotionRepository.decrementUsage.mockResolvedValue({ count: 0 })

      await expect(service.cancel(USER_ID, ORDER_ID)).rejects.toThrow(
        'Promotion usage count is inconsistent',
      )

      expect(emailQueueService.addOrderCancelled).not.toHaveBeenCalled()
      expect(notificationService.create).not.toHaveBeenCalled()
      expect(realtimeService.orderCancelled).not.toHaveBeenCalled()
    })
  })

  describe('markPendingDelivery', () => {
    const order = { id: ORDER_ID, userId: USER_ID }

    it('transitions the order and notifies the owner', async () => {
      orderRepository.findById.mockResolvedValue(order)
      orderRepository.markPendingDelivery.mockResolvedValue({ count: 1 })

      await service.markPendingDelivery(ORDER_ID, USER_ID)

      expect(emailQueueService.addOrderPendingDelivery).toHaveBeenCalledWith(ORDER_ID)
      expect(realtimeService.orderUpdated).toHaveBeenCalledWith(USER_ID, {
        orderId: ORDER_ID,
        status: OrderStatus.PENDING_DELIVERY,
      })
    })

    it('throws when the order is not found', async () => {
      orderRepository.findById.mockResolvedValue(null)

      await expect(service.markPendingDelivery(ORDER_ID, USER_ID)).rejects.toThrow('Order not found')
      expect(orderRepository.markPendingDelivery).not.toHaveBeenCalled()
    })

    it('throws on an invalid status transition', async () => {
      orderRepository.findById.mockResolvedValue(order)
      orderRepository.markPendingDelivery.mockResolvedValue({ count: 0 })

      await expect(service.markPendingDelivery(ORDER_ID, USER_ID)).rejects.toThrow('Invalid order status transition')
    })
  })

  describe('markDelivered', () => {
    const order = { id: ORDER_ID, userId: USER_ID }

    it('transitions the order, notifies and pushes realtime update', async () => {
      orderRepository.findById.mockResolvedValue(order)
      orderRepository.markDelivered.mockResolvedValue({ count: 1 })

      await service.markDelivered(ORDER_ID, USER_ID)

      expect(emailQueueService.addOrderDelivered).toHaveBeenCalledWith(ORDER_ID)
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, type: NotificationType.ORDER }),
      )
      expect(realtimeService.orderUpdated).toHaveBeenCalledWith(USER_ID, {
        orderId: ORDER_ID,
        status: OrderStatus.DELIVERED,
      })
    })

    it('throws when the order is not found', async () => {
      orderRepository.findById.mockResolvedValue(null)

      await expect(service.markDelivered(ORDER_ID, USER_ID)).rejects.toThrow('Order not found')

      expect(orderRepository.markDelivered).not.toHaveBeenCalled()
      expect(emailQueueService.addOrderDelivered).not.toHaveBeenCalled()
      expect(notificationService.create).not.toHaveBeenCalled()
      expect(realtimeService.orderUpdated).not.toHaveBeenCalled()
    })

    it('throws on an invalid status transition', async () => {
      orderRepository.findById.mockResolvedValue(order)
      orderRepository.markDelivered.mockResolvedValue({ count: 0 })

      await expect(service.markDelivered(ORDER_ID, USER_ID)).rejects.toThrow('Invalid order status transition')
    })
  })

  describe('markReturned', () => {
    const order = {
      id: ORDER_ID,
      userId: USER_ID,
      items: [
        { skuId: 10, quantity: 2 },
        { skuId: 11, quantity: 1 },
      ],
    }

    it('restores inventory and records RETURN transactions', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(order)
      orderRepository.markReturned.mockResolvedValue({ count: 1 })

      await service.markReturned(ORDER_ID, USER_ID)

      expect(inventoryRepository.incrementStock).toHaveBeenCalledTimes(2)
      expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: InventoryTransactionType.RETURN }),
      )
      expect(emailQueueService.addOrderReturned).toHaveBeenCalledWith(ORDER_ID)
      expect(realtimeService.orderUpdated).toHaveBeenCalledWith(USER_ID, {
        orderId: ORDER_ID,
        status: OrderStatus.RETURNED,
      })
    })

    it('throws when the order is not found', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(null)

      await expect(service.markReturned(ORDER_ID, USER_ID)).rejects.toThrow('Order not found')
      expect(orderRepository.markReturned).not.toHaveBeenCalled()
    })

    it('throws on an invalid status transition', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(order)
      orderRepository.markReturned.mockResolvedValue({ count: 0 })

      await expect(service.markReturned(ORDER_ID, USER_ID)).rejects.toThrow('Invalid order status transition')
      expect(inventoryRepository.incrementStock).not.toHaveBeenCalled()
    })

    it('throws when a SKU no longer exists while returning inventory', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(order)
      orderRepository.markReturned.mockResolvedValue({ count: 1 })
      inventoryRepository.incrementStock.mockResolvedValueOnce(null)

      await expect(service.markReturned(ORDER_ID, USER_ID)).rejects.toThrow(
        'SKU no longer exists while returning inventory',
      )

      expect(inventoryRepository.createTransaction).not.toHaveBeenCalled()
      expect(emailQueueService.addOrderReturned).not.toHaveBeenCalled()
      expect(realtimeService.orderUpdated).not.toHaveBeenCalled()
    })
  })
})
