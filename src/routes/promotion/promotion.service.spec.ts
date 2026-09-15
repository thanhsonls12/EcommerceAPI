import { Test } from '@nestjs/testing'
import { PromotionService } from './promotion.service'
import { PromotionRepository } from './promotion.repository'
import { Prisma } from '../../../generated/prisma/client'

describe('PromotionService', () => {
  let service: PromotionService

  const promotionRepository = {
    create: jest.fn(),
    findByCode: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  }

  const startsAt = new Date('2026-09-01T00:00:00.000Z')
  const expiresAt = new Date('2026-10-01T00:00:00.000Z')

  const existingPromotion = {
    id: 1,
    code: 'SALE20',
    name: 'Sale 20%',
    description: null,
    type: 'PERCENT' as const,
    value: new Prisma.Decimal(20),
    minOrderValue: null,
    maxDiscount: new Prisma.Decimal(100000),
    usageLimit: 100,
    usedCount: 0,
    startsAt,
    expiresAt,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: PromotionRepository,
          useValue: promotionRepository,
        },
      ],
    }).compile()

    service = moduleRef.get(PromotionService)

    jest.clearAllMocks()
  })

  it('should create promotion with normalized code', async () => {
    promotionRepository.findByCode.mockResolvedValue(null)

    const createdPromotion = {
      ...existingPromotion,
      code: 'SALE20',
    }

    promotionRepository.create.mockResolvedValue(createdPromotion)

    const result = await service.create({
      code: 'sale20',
      name: 'Sale 20%',
      type: 'PERCENT',
      value: 20,
      startsAt,
      expiresAt,
    })

    expect(promotionRepository.findByCode).toHaveBeenCalledWith('SALE20')

    expect(promotionRepository.create).toHaveBeenCalledWith({
      code: 'SALE20',
      name: 'Sale 20%',
      description: undefined,
      type: 'PERCENT',
      value: 20,
      minOrderValue: undefined,
      maxDiscount: undefined,
      usageLimit: undefined,
      startsAt,
      expiresAt,
    })

    expect(result).toEqual(createdPromotion)
  })

  it('should throw when promotion code already exists', async () => {
    promotionRepository.findByCode.mockResolvedValue(existingPromotion)

    await expect(
      service.create({
        code: 'sale20',
        name: 'Sale 20%',
        type: 'PERCENT',
        value: 20,
        startsAt,
        expiresAt,
      }),
    ).rejects.toThrow('Promotion code already exists')

    expect(promotionRepository.create).not.toHaveBeenCalled()
  })

  it('should return all promotions', async () => {
    promotionRepository.findMany.mockResolvedValue([existingPromotion])

    const result = await service.findAll()

    expect(promotionRepository.findMany).toHaveBeenCalled()
    expect(result).toEqual([existingPromotion])
  })

  it('should return promotion by id', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)

    const result = await service.findById(1)

    expect(promotionRepository.findById).toHaveBeenCalledWith(1)
    expect(result).toEqual(existingPromotion)
  })

  it('should throw when promotion does not exist', async () => {
    promotionRepository.findById.mockResolvedValue(null)

    await expect(service.findById(999)).rejects.toThrow('Promotion not found')
  })

  it('should update promotion fields and normalize code', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)
    promotionRepository.findByCode.mockResolvedValue(null)

    const updatedPromotion = {
      ...existingPromotion,
      code: 'NEWCODE',
      name: 'Updated promotion',
      value: new Prisma.Decimal(25),
    }

    promotionRepository.update.mockResolvedValue(updatedPromotion)

    const result = await service.update(1, {
      code: 'newcode',
      name: 'Updated promotion',
      value: 25,
    })

    expect(promotionRepository.findByCode).toHaveBeenCalledWith('NEWCODE')
    expect(promotionRepository.update).toHaveBeenCalledWith(1, {
      code: 'NEWCODE',
      name: 'Updated promotion',
      value: 25,
    })
    expect(result).toEqual(updatedPromotion)
  })

  it('should allow updating code to the same promotion code', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)
    promotionRepository.findByCode.mockResolvedValue(existingPromotion)
    promotionRepository.update.mockResolvedValue(existingPromotion)

    await service.update(1, {
      code: 'sale20',
    })

    expect(promotionRepository.update).toHaveBeenCalledWith(1, {
      code: 'SALE20',
    })
  })

  it('should throw when update target does not exist', async () => {
    promotionRepository.findById.mockResolvedValue(null)

    await expect(
      service.update(999, {
        name: 'Missing',
      }),
    ).rejects.toThrow('Promotion not found')

    expect(promotionRepository.update).not.toHaveBeenCalled()
  })

  it('should reject invalid date range when updating', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)

    await expect(
      service.update(1, {
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow('Promotion expiration date must be after start date')

    expect(promotionRepository.update).not.toHaveBeenCalled()
  })

  it('should reject percentage promotion value over 100', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)

    await expect(
      service.update(1, {
        value: 120,
      }),
    ).rejects.toThrow('Percentage discount cannot exceed 100')

    expect(promotionRepository.update).not.toHaveBeenCalled()
  })

  it('should reject fixed promotion with max discount', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)

    await expect(
      service.update(1, {
        type: 'FIXED',
        maxDiscount: 50000,
      }),
    ).rejects.toThrow('maxDiscount only applies to percentage promotions')

    expect(promotionRepository.update).not.toHaveBeenCalled()
  })

  it('should clear max discount when changing promotion type to fixed', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)
    promotionRepository.update.mockResolvedValue({
      ...existingPromotion,
      type: 'FIXED',
      maxDiscount: null,
    })

    await service.update(1, {
      type: 'FIXED',
    })

    expect(promotionRepository.update).toHaveBeenCalledWith(1, {
      type: 'FIXED',
      maxDiscount: null,
    })
  })

  it('should throw when updating to a code used by another promotion', async () => {
    promotionRepository.findById.mockResolvedValue(existingPromotion)
    promotionRepository.findByCode.mockResolvedValue({
      ...existingPromotion,
      id: 2,
      code: 'OTHER',
    })

    await expect(
      service.update(1, {
        code: 'other',
      }),
    ).rejects.toThrow('Promotion code already exists')

    expect(promotionRepository.update).not.toHaveBeenCalled()
  })

  it('should delete promotion', async () => {
    promotionRepository.softDelete.mockResolvedValue({
      count: 1,
    })

    const result = await service.delete(1)

    expect(promotionRepository.softDelete).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      message: 'Promotion deleted successfully',
    })
  })

  it('should throw when deleting missing promotion', async () => {
    promotionRepository.softDelete.mockResolvedValue({
      count: 0,
    })

    await expect(service.delete(999)).rejects.toThrow('Promotion not found')
  })
})
