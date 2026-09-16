import { Test } from '@nestjs/testing'
import { InventoryService } from './inventory.service'
import { InventoryRepository } from './inventory.repository'
import { InventoryTransactionType } from '../../../generated/prisma/enums'

describe('InventoryService', () => {
  let service: InventoryService

  const inventoryRepository = {
    transaction: jest.fn(),
    findSkuById: jest.fn(),
    adjustStock: jest.fn(),
    createTransaction: jest.fn(),
    findHistoryBySkuId: jest.fn(),
    countHistoryBySkuId: jest.fn(),
    findLowStock: jest.fn(),
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: inventoryRepository,
        },
      ],
    }).compile()
    service = moduleRef.get(InventoryService)
    jest.clearAllMocks()

    inventoryRepository.transaction.mockImplementation((callback) => callback({}))
  })

  it('should restock inventory and create transaction', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    inventoryRepository.adjustStock.mockResolvedValue({
      stock: 15,
    })

    const inventoryTransaction = {
      id: 100,
    }

    inventoryRepository.createTransaction.mockResolvedValue(inventoryTransaction)

    const result = await service.adjust(
      {
        skuId: 1,
        quantity: 5,
        type: 'RESTOCK',
        note: 'New shipment',
      },
      10,
    )

    expect(inventoryRepository.adjustStock).toHaveBeenCalledWith(expect.anything(), 1, 5)

    expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(expect.anything(), {
      skuId: 1,
      type: InventoryTransactionType.RESTOCK,
      quantity: 5,
      stockBefore: 10,
      stockAfter: 15,
      note: 'New shipment',
      createdById: 10,
    })

    expect(result).toEqual({
      skuId: 1,
      stock: 15,
      transaction: inventoryTransaction,
    })
  })

  it('should throw when SKU does not exist', async () => {
    inventoryRepository.findSkuById.mockResolvedValue(null)

    await expect(
      service.adjust(
        {
          skuId: 999,
          quantity: 5,
          type: 'RESTOCK',
        },
        1,
      ),
    ).rejects.toThrow('SKU not found')

    expect(inventoryRepository.adjustStock).not.toHaveBeenCalled()

    expect(inventoryRepository.createTransaction).not.toHaveBeenCalled()
  })

  it('should reject non-positive restock quantity', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    await expect(
      service.adjust(
        {
          skuId: 1,
          quantity: 0,
          type: 'RESTOCK',
        },
        1,
      ),
    ).rejects.toThrow('Restock quantity must be greater than zero')

    expect(inventoryRepository.adjustStock).not.toHaveBeenCalled()
  })

  it('should reject zero adjustment quantity', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    await expect(
      service.adjust(
        {
          skuId: 1,
          quantity: 0,
          type: 'ADJUSTMENT',
        },
        1,
      ),
    ).rejects.toThrow('Adjustment quantity must not be zero')
  })

  it('should reject adjustment that makes stock negative', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 3,
    })

    inventoryRepository.adjustStock.mockResolvedValue(null)

    await expect(
      service.adjust(
        {
          skuId: 1,
          quantity: -5,
          type: 'ADJUSTMENT',
        },
        1,
      ),
    ).rejects.toThrow('Inventory adjustment would make stock negative')

    expect(inventoryRepository.createTransaction).not.toHaveBeenCalled()
  })

  it('should accept positive adjustment and map type correctly', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    inventoryRepository.adjustStock.mockResolvedValue({
      stock: 12,
    })

    inventoryRepository.createTransaction.mockResolvedValue({ id: 101 })

    const result = await service.adjust(
      {
        skuId: 1,
        quantity: 2,
        type: 'ADJUSTMENT',
      },
      10,
    )

    expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(expect.anything(), {
      skuId: 1,
      type: InventoryTransactionType.ADJUSTMENT,
      quantity: 2,
      stockBefore: 10,
      stockAfter: 12,
      note: undefined,
      createdById: 10,
    })

    expect(result.stock).toBe(12)
  })

  it('should accept negative adjustment that keeps stock non-negative', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    inventoryRepository.adjustStock.mockResolvedValue({
      stock: 7,
    })

    await service.adjust(
      {
        skuId: 1,
        quantity: -3,
        type: 'ADJUSTMENT',
      },
      10,
    )

    expect(inventoryRepository.createTransaction).toHaveBeenCalledWith(expect.anything(), {
      skuId: 1,
      type: InventoryTransactionType.ADJUSTMENT,
      quantity: -3,
      stockBefore: 10,
      stockAfter: 7,
      note: undefined,
      createdById: 10,
    })
  })

  it('should reject negative restock quantity', async () => {
    inventoryRepository.findSkuById.mockResolvedValue({
      id: 1,
      stock: 10,
    })

    await expect(
      service.adjust(
        {
          skuId: 1,
          quantity: -5,
          type: 'RESTOCK',
        },
        1,
      ),
    ).rejects.toThrow('Restock quantity must be greater than zero')

    expect(inventoryRepository.adjustStock).not.toHaveBeenCalled()
  })

  it('should return inventory history', async () => {
    const history = [
      {
        id: 1,
        skuId: 1,
      },
    ]

    inventoryRepository.findHistoryBySkuId.mockResolvedValue(history)
    inventoryRepository.countHistoryBySkuId.mockResolvedValue(1)

    const result = await service.findHistory(1, { page: 1, limit: 20 })

    expect(inventoryRepository.findHistoryBySkuId).toHaveBeenCalledWith(1, 0, 20)
    expect(result).toEqual({
      data: history,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    })
  })

  it('should return empty history when SKU exists', async () => {
    inventoryRepository.findHistoryBySkuId.mockResolvedValue([])
    inventoryRepository.countHistoryBySkuId.mockResolvedValue(0)
    inventoryRepository.findSkuById.mockResolvedValue({ id: 1 })

    const result = await service.findHistory(1, { page: 1, limit: 20 })

    expect(result).toEqual({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    })
  })

  it('should throw when SKU has no history and does not exist', async () => {
    inventoryRepository.findHistoryBySkuId.mockResolvedValue([])
    inventoryRepository.countHistoryBySkuId.mockResolvedValue(0)
    inventoryRepository.findSkuById.mockResolvedValue(null)

    await expect(service.findHistory(999, { page: 1, limit: 20 })).rejects.toThrow('SKU not found')
  })

  it('should delegate low stock query to repository', async () => {
    const lowStock = [{ id: 1, stock: 2 }]

    inventoryRepository.findLowStock.mockResolvedValue(lowStock)

    const result = await service.findLowStock(5)

    expect(inventoryRepository.findLowStock).toHaveBeenCalledWith(5)
    expect(result).toEqual(lowStock)
  })
})
