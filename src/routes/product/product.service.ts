import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ProductRepository } from './product.repository'
import { BrandRepository } from '../brand/brand.repository'
import { CategoryRepository } from '../category/category.repository'
import { CreateProductBodyDTO, UpdateProductBodyDTO } from './product.dto'

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly brandRepository: BrandRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  findAll() {
    return this.productRepository.findMany()
  }

  async findById(id: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    return product
  }

  async create(body: CreateProductBodyDTO, userId: number) {
    const brand = await this.brandRepository.findById(body.brandId)

    if (!brand) {
      throw new NotFoundException('Brand not found')
    }

    const categoryIds = [...new Set(body.categoryIds)]

    if (categoryIds.length !== body.categoryIds.length) {
      throw new BadRequestException('Duplicate category ids')
    }

    const categories = await this.categoryRepository.findManyByIds(categoryIds)

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Category not found')
    }

    if (body.virtualPrice < body.basePrice) {
      throw new BadRequestException('Virtual price cannot be less than base price')
    }
    return this.productRepository.create({
      name: body.name,
      basePrice: body.basePrice,
      virtualPrice: body.virtualPrice,
      images: body.images,
      brand: {
        connect: {
          id: body.brandId,
        },
      },
      categories: {
        connect: categoryIds.map((id) => ({ id })),
      },
      createdBy: {
        connect: {
          id: userId,
        },
      },
    })
  }

  async delete(id: number, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    await this.productRepository.softDelete(id, userId)

    return {
      message: 'Product deleted successfully',
    }
  }

  async update(id: number, body: UpdateProductBodyDTO, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    if (body.brandId !== undefined) {
      const brand = await this.brandRepository.findById(body.brandId)

      if (!brand) {
        throw new NotFoundException('Brand not found')
      }
    }

    let categoryIds: number[] | undefined

    if (body.categoryIds !== undefined) {
      categoryIds = [...new Set(body.categoryIds)]
      if (categoryIds.length !== body.categoryIds.length) {
        throw new BadRequestException('Duplicate category ids')
      }
      const categories = await this.categoryRepository.findManyByIds(categoryIds)

      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('Category not found')
      }
    }

    const basePrice = body.basePrice ?? Number(product.basePrice)
    const virtualPrice = body.virtualPrice ?? Number(product.virtualPrice)

    if (virtualPrice < basePrice) {
      throw new BadRequestException('Virtual price cannot be less than base price')
    }

    return this.productRepository.update(id, {
      ...(body.name !== undefined && {
        name: body.name,
      }),

      ...(body.basePrice !== undefined && {
        basePrice: body.basePrice,
      }),

      ...(body.virtualPrice !== undefined && {
        virtualPrice: body.virtualPrice,
      }),

      ...(body.images !== undefined && {
        images: body.images,
      }),

      ...(body.brandId !== undefined && {
        brand: {
          connect: {
            id: body.brandId,
          },
        },
      }),

      ...(categoryIds !== undefined && {
        categories: {
          set: categoryIds.map((categoryId) => ({
            id: categoryId,
          })),
        },
      }),

      updatedBy: {
        connect: {
          id: userId,
        },
      },
    })
  }
}
