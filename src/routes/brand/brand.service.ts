import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BrandRepository } from './brand.repository'
import { CreateBrandBodyDTO, UpdateBrandBodyDTO } from './brand.dto'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  findAll() {
    return this.brandRepository.findMany()
  }

  create(body: CreateBrandBodyDTO, userId: number) {
    return this.brandRepository.create({
      ...body,
      createdById: userId,
    })
  }

  async update(id: number, body: UpdateBrandBodyDTO, userId: number) {
    const brand = await this.brandRepository.findById(id)

    if (!brand) {
      throw new NotFoundException(MESSAGE.BRAND.NOT_FOUND)
    }

    return this.brandRepository.update(id, {
      ...body,
      updatedById: userId,
    })
  }

  async delete(id: number, userId: number) {
    const brand = await this.brandRepository.findById(id)

    if (!brand) {
      throw new NotFoundException(MESSAGE.BRAND.NOT_FOUND)
    }

    const productsCount = await this.brandRepository.countProducts(id)

    if (productsCount > 0) {
      throw new BadRequestException(MESSAGE.BRAND.CANNOT_DELETE_WITH_ACTIVE_PRODUCTS)
    }

    await this.brandRepository.softDelete(id, userId)

    return {
      message: MESSAGE.BRAND.DELETED_SUCCESSFULLY,
    }
  }
}
