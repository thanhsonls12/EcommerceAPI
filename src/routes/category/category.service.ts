import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CategoryRepository } from './category.repository'
import { CreateCategoryBodyDTO, UpdateCategoryBodyDTO } from './category.dto'

@Injectable()
export class CategoryService {
  private async ensureNoCycle(categoryId: number, parentCategoryId: number) {
    let currentId: number | null = parentCategoryId
    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new BadRequestException('Parent category cannot be itself')
      }
      const parent = await this.categoryRepository.findParentId(currentId)
      if (!parent) break
      currentId = parent?.parentCategoryId
    }
  }
  constructor(private readonly categoryRepository: CategoryRepository) {}

  findAll() {
    return this.categoryRepository.findMany()
  }

  async create(body: CreateCategoryBodyDTO, userId: number) {
    if (body.parentCategoryId) {
      const parent = await this.categoryRepository.findById(body.parentCategoryId)

      if (!parent) {
        throw new BadRequestException('Parent category not found')
      }
    }

    return this.categoryRepository.create({ ...body, createdById: userId })
  }

  async update(id: number, body: UpdateCategoryBodyDTO, userId: number) {
    const category = await this.categoryRepository.findById(id)

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    if (body.parentCategoryId) {
      const parent = await this.categoryRepository.findById(body.parentCategoryId)

      if (!parent) {
        throw new BadRequestException('Parent category not found')
      }

      await this.ensureNoCycle(id, body.parentCategoryId)
    }

    return this.categoryRepository.update(id, { ...body, updatedById: userId })
  }

  async delete(id: number, userId: number) {
    const category = await this.categoryRepository.findById(id)

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    const childrenCount = await this.categoryRepository.countChildren(id)

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with active child categories')
    }

    await this.categoryRepository.softDelete(id, userId)

    return {
      message: 'Category deleted successfully',
    }
  }
}
