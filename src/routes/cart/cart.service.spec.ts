import { Test, TestingModule } from '@nestjs/testing'
import { Prisma } from '../../../generated/prisma/client'
import { CartService } from './cart.service'
import { CartRepository } from './cart.repository'
import { SKURepository } from '../product/sku.repository'

describe('CartService', () => {
  let service: CartService
  let repository: {
    transaction: jest.Mock
    findByUserId: jest.Mock
    findSkusForMerge: jest.Mock
    findItemsForMerge: jest.Mock
    setItemQuantity: jest.Mock
    findItem: jest.Mock
    upsertItem: jest.Mock
    updateQuantity: jest.Mock
    deleteItem: jest.Mock
    deleteAllByUserId: jest.Mock
  }
  let skuRepository: { findById: jest.Mock }
  const tx = {} as Prisma.TransactionClient

  beforeEach(async () => {
    repository = {
      transaction: jest.fn((callback) => callback(tx)),
      findByUserId: jest.fn().mockResolvedValue([]),
      findSkusForMerge: jest.fn(),
      findItemsForMerge: jest.fn(),
      setItemQuantity: jest.fn(),
      findItem: jest.fn(),
      upsertItem: jest.fn(),
      updateQuantity: jest.fn(),
      deleteItem: jest.fn(),
      deleteAllByUserId: jest.fn(),
    }
    skuRepository = { findById: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: repository },
        { provide: SKURepository, useValue: skuRepository },
      ],
    }).compile()

    service = module.get(CartService)
  })

  describe('merge', () => {
    it('uses the larger server or guest quantity so retrying is idempotent', async () => {
      repository.findSkusForMerge.mockResolvedValue([{ id: 10, stock: 20 }])
      repository.findItemsForMerge.mockResolvedValue([{ skuId: 10, quantity: 4 }])

      const result = await service.merge(1, { items: [{ skuId: 10, quantity: 3 }] })

      expect(repository.setItemQuantity).toHaveBeenCalledWith(tx, 1, 10, 4)
      expect(result.adjustments).toEqual([{ skuId: 10, requested: 3, merged: 4 }])
    })

    it('limits merged quantity to current stock', async () => {
      repository.findSkusForMerge.mockResolvedValue([{ id: 10, stock: 2 }])
      repository.findItemsForMerge.mockResolvedValue([])

      const result = await service.merge(1, { items: [{ skuId: 10, quantity: 5 }] })

      expect(repository.setItemQuantity).toHaveBeenCalledWith(tx, 1, 10, 2)
      expect(result.adjustments).toEqual([{ skuId: 10, requested: 5, merged: 2, reason: 'STOCK_LIMIT' }])
    })

    it('does not restore unavailable SKUs into the server cart', async () => {
      repository.findSkusForMerge.mockResolvedValue([])
      repository.findItemsForMerge.mockResolvedValue([])

      const result = await service.merge(1, { items: [{ skuId: 999, quantity: 1 }] })

      expect(repository.setItemQuantity).not.toHaveBeenCalled()
      expect(result.adjustments).toEqual([{ skuId: 999, requested: 1, merged: 0, reason: 'UNAVAILABLE' }])
    })
  })
})
