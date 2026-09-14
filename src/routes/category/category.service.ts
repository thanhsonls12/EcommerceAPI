import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CategoryRepository } from './category.repository'
import { CreateCategoryBodyDTO, UpdateCategoryBodyDTO } from './category.dto'
import { MESSAGE } from '@/shared/constants/message.constant'
import { CacheService } from '@/shared/services/cache.service'

@Injectable()
export class CategoryService {
  private async ensureNoCycle(categoryId: number, parentCategoryId: number) {
    let currentId: number | null = parentCategoryId
    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new BadRequestException(MESSAGE.CATEGORY.PARENT_CANNOT_BE_ITSELF)
      }
      const parent = await this.categoryRepository.findParentId(currentId)
      if (!parent) break
      currentId = parent?.parentCategoryId
    }
  }
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findAll() {
    const cachedKey = 'category:list'
    const cachedCategories = await this.cacheService.get(cachedKey)
    if (cachedCategories) {
      return cachedCategories
    }
    const categories = await this.categoryRepository.findMany()
    await this.cacheService.set(cachedKey, categories, 600)

    return categories
  }

  async create(body: CreateCategoryBodyDTO, userId: number) {
    if (body.parentCategoryId) {
      const parent = await this.categoryRepository.findById(body.parentCategoryId)

      if (!parent) {
        throw new BadRequestException(MESSAGE.CATEGORY.PARENT_NOT_FOUND)
      }
    }

    const category = await this.categoryRepository.create({ ...body, createdById: userId })

    await this.cacheService.delete('category:list')

    return category
  }

  async update(id: number, body: UpdateCategoryBodyDTO, userId: number) {
    const category = await this.categoryRepository.findById(id)

    if (!category) {
      throw new NotFoundException(MESSAGE.CATEGORY.NOT_FOUND)
    }

    if (body.parentCategoryId) {
      const parent = await this.categoryRepository.findById(body.parentCategoryId)

      if (!parent) {
        throw new BadRequestException(MESSAGE.CATEGORY.PARENT_NOT_FOUND)
      }

      await this.ensureNoCycle(id, body.parentCategoryId)
    }

    const updatedCategory = await this.categoryRepository.update(id, { ...body, updatedById: userId })

    await this.cacheService.delete(`category:list`)

    await this.cacheService.increment('product:list:version')

    await this.cacheService.increment('product:detail:version')

    return updatedCategory
  }

  async delete(id: number, userId: number) {
    const category = await this.categoryRepository.findById(id)

    if (!category) {
      throw new NotFoundException(MESSAGE.CATEGORY.NOT_FOUND)
    }

    const childrenCount = await this.categoryRepository.countChildren(id)

    if (childrenCount > 0) {
      throw new BadRequestException(MESSAGE.CATEGORY.CANNOT_DELETE_WITH_ACTIVE_CHILDREN)
    }

    await this.categoryRepository.softDelete(id, userId)

    await this.cacheService.delete(`category:list`)

    await this.cacheService.increment('product:list:version')

    await this.cacheService.increment('product:detail:version')

    return {
      message: MESSAGE.CATEGORY.DELETED_SUCCESSFULLY,
    }
  }
}
