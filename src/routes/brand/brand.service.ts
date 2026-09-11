import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BrandRepository } from './brand.repository'
import { CreateBrandBodyDTO, UpdateBrandBodyDTO } from './brand.dto'

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
      throw new NotFoundException('Brand not found')
    }

    return this.brandRepository.update(id, {
      ...body,
      updatedById: userId,
    })
  }

  async delete(id: number, userId: number) {
    const brand = await this.brandRepository.findById(id)

    if (!brand) {
      throw new NotFoundException('Brand not found')
    }

    const productsCount = await this.brandRepository.countProducts(id)

    if (productsCount > 0) {
      throw new BadRequestException('Cannot delete brand with active products')
    }

    await this.brandRepository.softDelete(id, userId)

    return {
      message: 'Brand deleted successfully',
    }
  }
}
