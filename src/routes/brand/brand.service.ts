import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BrandRepository } from './brand.repository'
import { CreateBrandBodyDTO, UpdateBrandBodyDTO } from './brand.dto'
import { MESSAGE } from '@/shared/constants/message.constant'
import { CacheService } from '@/shared/services/cache.service'

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findAll() {
    const cacheKey = 'brand:list'
    const cachedBrands = await this.cacheService.get(cacheKey)
    if (cachedBrands) {
      return cachedBrands
    }
    const brands = await this.brandRepository.findMany()

    await this.cacheService.set(cacheKey, brands, 600)

    return brands
  }

  async create(body: CreateBrandBodyDTO, userId: number) {
    const brand = await this.brandRepository.create({
      ...body,
      createdById: userId,
    })

    await this.cacheService.delete('brand:list')

    return brand
  }

  async update(id: number, body: UpdateBrandBodyDTO, userId: number) {
    const brand = await this.brandRepository.findById(id)

    if (!brand) {
      throw new NotFoundException(MESSAGE.BRAND.NOT_FOUND)
    }

    const updatedBrand = await this.brandRepository.update(id, {
      ...body,
      updatedById: userId,
    })

    await this.cacheService.delete(`brand:list`)

    await this.cacheService.increment('product:list:version')

    await this.cacheService.increment('product:detail:version')

    return updatedBrand
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

    await this.cacheService.delete(`brand:list`)

    return {
      message: MESSAGE.BRAND.DELETED_SUCCESSFULLY,
    }
  }
}
