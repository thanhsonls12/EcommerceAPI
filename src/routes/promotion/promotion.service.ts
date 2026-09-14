import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PromotionRepository } from './promotion.repository'
import { CreatePromotionBodyDTO, UpdatePromotionBodyDTO } from './promotion.dto'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class PromotionService {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  async create(body: CreatePromotionBodyDTO) {
    const code = body.code.toUpperCase()

    const existing = await this.promotionRepository.findByCode(code)

    if (existing) {
      throw new ConflictException(MESSAGE.PROMOTION.CODE_ALREADY_EXISTS)
    }

    return this.promotionRepository.create({
      code,
      name: body.name,
      description: body.description,
      type: body.type,
      value: body.value,
      minOrderValue: body.minOrderValue,
      maxDiscount: body.maxDiscount,
      usageLimit: body.usageLimit,
      startsAt: body.startsAt,
      expiresAt: body.expiresAt,
    })
  }

  findAll() {
    return this.promotionRepository.findMany()
  }

  async findById(id: number) {
    const promotion = await this.promotionRepository.findById(id)

    if (!promotion) {
      throw new NotFoundException(MESSAGE.PROMOTION.NOT_FOUND)
    }

    return promotion
  }

  async update(id: number, body: UpdatePromotionBodyDTO) {
    const promotion = await this.promotionRepository.findById(id)

    if (!promotion) {
      throw new NotFoundException(MESSAGE.PROMOTION.NOT_FOUND)
    }

    const type = body.type ?? promotion.type

    const value = body.value !== undefined ? body.value : promotion.value.toNumber()

    const startsAt = body.startsAt ?? promotion.startsAt

    const expiresAt = body.expiresAt ?? promotion.expiresAt

    const maxDiscount =
      body.maxDiscount !== undefined
        ? body.maxDiscount
        : body.type === 'FIXED'
          ? null
          : promotion.maxDiscount?.toNumber()

    if (expiresAt <= startsAt) {
      throw new BadRequestException(MESSAGE.PROMOTION.INVALID_DATE_RANGE)
    }

    if (type === 'PERCENT' && value > 100) {
      throw new BadRequestException(MESSAGE.PROMOTION.INVALID_PERCENT_VALUE)
    }

    if (type === 'FIXED' && maxDiscount !== null && maxDiscount !== undefined) {
      throw new BadRequestException(MESSAGE.PROMOTION.MAX_DISCOUNT_ONLY_FOR_PERCENT)
    }

    if (body.code) {
      const normalizedCode = body.code.toUpperCase()

      const existing = await this.promotionRepository.findByCode(normalizedCode)

      if (existing && existing.id !== id) {
        throw new ConflictException(MESSAGE.PROMOTION.CODE_ALREADY_EXISTS)
      }
    }

    return this.promotionRepository.update(id, {
      ...(body.code !== undefined && {
        code: body.code.toUpperCase(),
      }),
      ...(body.name !== undefined && {
        name: body.name,
      }),
      ...(body.description !== undefined && {
        description: body.description,
      }),
      ...(body.type !== undefined && {
        type: body.type,
      }),
      ...(body.value !== undefined && {
        value: body.value,
      }),
      ...(body.minOrderValue !== undefined && {
        minOrderValue: body.minOrderValue,
      }),
      ...(body.maxDiscount !== undefined && {
        maxDiscount: body.maxDiscount,
      }),
      ...(body.type === 'FIXED' &&
        body.maxDiscount === undefined && {
          maxDiscount: null,
        }),
      ...(body.usageLimit !== undefined && {
        usageLimit: body.usageLimit,
      }),
      ...(body.startsAt !== undefined && {
        startsAt: body.startsAt,
      }),
      ...(body.expiresAt !== undefined && {
        expiresAt: body.expiresAt,
      }),
      ...(body.isActive !== undefined && {
        isActive: body.isActive,
      }),
    })
  }

  async delete(id: number) {
    const result = await this.promotionRepository.softDelete(id)

    if (result.count !== 1) {
      throw new NotFoundException(MESSAGE.PROMOTION.NOT_FOUND)
    }

    return {
      message: MESSAGE.PROMOTION.DELETED_SUCCESSFULLY,
    }
  }
}
