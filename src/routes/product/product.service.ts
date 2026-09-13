import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ProductRepository } from './product.repository'
import { BrandRepository } from '../brand/brand.repository'
import { CategoryRepository } from '../category/category.repository'
import { CreateProductBodyDTO, GetProductsQueryDTO, UpdateProductBodyDTO } from './product.dto'
import { Prisma } from '../../../generated/prisma/client'
import { SKURepository } from './sku.repository'
import { StorageService } from '@/shared/services/storage.service'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class ProductService {
  private validateVariants(
    variants: {
      name: string
      options: string[]
    }[],
  ) {
    const variantNames = variants.map((variant) => variant.name.trim().toLowerCase())

    if (new Set(variantNames).size !== variantNames.length) {
      throw new BadRequestException(MESSAGE.PRODUCT.DUPLICATE_VARIANT_NAMES)
    }

    for (const variant of variants) {
      const normalizedOptions = variant.options.map((option) => option.trim().toLowerCase())

      if (new Set(normalizedOptions).size !== normalizedOptions.length) {
        throw new BadRequestException(MESSAGE.PRODUCT.DUPLICATE_OPTIONS_IN_VARIANT(variant.name))
      }
    }
  }

  private normalizeVariants(
    variants: {
      name: string
      options: string[]
    }[],
  ) {
    return variants
      .map((variant) => ({
        name: variant.name.trim().toLowerCase(),
        options: variant.options.map((option) => option.trim().toLowerCase()).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  private areVariantsEqual(
    currentVariants: Prisma.JsonValue | null,
    newVariants: {
      name: string
      options: string[]
    }[],
  ) {
    if (!Array.isArray(currentVariants)) {
      return false
    }

    const current = this.normalizeVariants(
      currentVariants as {
        name: string
        options: string[]
      }[],
    )

    const next = this.normalizeVariants(newVariants)

    return JSON.stringify(current) === JSON.stringify(next)
  }
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly brandRepository: BrandRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly skuRepository: SKURepository,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: GetProductsQueryDTO) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new BadRequestException(MESSAGE.PRODUCT.MIN_PRICE_GREATER_THAN_MAX_PRICE)
    }

    const skip = (query.page - 1) * query.limit

    if (query.search) {
      const searchParams = {
        search: query.search,
        brandId: query.brandId,
        categoryId: query.categoryId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      }

      const [searchResults, total] = await Promise.all([
        this.productRepository.searchIds({
          ...searchParams,
          skip,
          take: query.limit,
        }),
        this.productRepository.countSearch(searchParams),
      ])

      const ids = searchResults.map((result) => result.id)

      if (ids.length === 0) {
        return {
          data: [],
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        }
      }

      const products = await this.productRepository.findManyByIds(ids)

      const productMap = new Map(products.map((product) => [product.id, product]))

      const sortedProducts = ids.map((id) => productMap.get(id)).filter((product) => product !== undefined)

      return {
        data: sortedProducts,

        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      }
    }

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.brandId !== undefined && {
        brandId: query.brandId,
      }),
      ...(query.categoryId !== undefined && {
        categories: {
          some: {
            id: query.categoryId,
            deletedAt: null,
          },
        },
      }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        basePrice: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      }),
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sortBy === 'price'
        ? {
            basePrice: query.sortOrder,
          }
        : {
            createdAt: query.sortOrder,
          }

    const [products, total] = await Promise.all([
      this.productRepository.findMany({ where, skip, take: query.limit, orderBy }),
      this.productRepository.count(where),
    ])

    return {
      data: products,

      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async findById(id: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    return product
  }

  async create(body: CreateProductBodyDTO, userId: number) {
    const brand = await this.brandRepository.findById(body.brandId)

    if (!brand) {
      throw new NotFoundException(MESSAGE.PRODUCT.BRAND_NOT_FOUND)
    }

    const categoryIds = [...new Set(body.categoryIds)]

    if (categoryIds.length !== body.categoryIds.length) {
      throw new BadRequestException(MESSAGE.PRODUCT.DUPLICATE_CATEGORY_IDS)
    }

    const categories = await this.categoryRepository.findManyByIds(categoryIds)

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException(MESSAGE.PRODUCT.CATEGORY_NOT_FOUND)
    }

    if (body.virtualPrice < body.basePrice) {
      throw new BadRequestException(MESSAGE.PRODUCT.VIRTUAL_PRICE_LESS_THAN_BASE_PRICE)
    }

    if (body.variants !== undefined) {
      this.validateVariants(body.variants)
    }

    return this.productRepository.create({
      name: body.name,
      basePrice: body.basePrice,
      virtualPrice: body.virtualPrice,
      images: [],
      ...(body.variants !== undefined && {
        variants: body.variants,
      }),
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
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    await this.productRepository.softDelete(id, userId)

    return {
      message: MESSAGE.PRODUCT.DELETED_SUCCESSFULLY,
    }
  }

  async update(id: number, body: UpdateProductBodyDTO, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    if (body.brandId !== undefined) {
      const brand = await this.brandRepository.findById(body.brandId)

      if (!brand) {
        throw new NotFoundException(MESSAGE.PRODUCT.BRAND_NOT_FOUND)
      }
    }

    let categoryIds: number[] | undefined

    if (body.categoryIds !== undefined) {
      categoryIds = [...new Set(body.categoryIds)]
      if (categoryIds.length !== body.categoryIds.length) {
        throw new BadRequestException(MESSAGE.PRODUCT.DUPLICATE_CATEGORY_IDS)
      }
      const categories = await this.categoryRepository.findManyByIds(categoryIds)

      if (categories.length !== categoryIds.length) {
        throw new NotFoundException(MESSAGE.PRODUCT.CATEGORY_NOT_FOUND)
      }
    }

    const basePrice = body.basePrice ?? Number(product.basePrice)
    const virtualPrice = body.virtualPrice ?? Number(product.virtualPrice)

    if (virtualPrice < basePrice) {
      throw new BadRequestException(MESSAGE.PRODUCT.VIRTUAL_PRICE_LESS_THAN_BASE_PRICE)
    }

    if (body.variants !== undefined) {
      this.validateVariants(body.variants)

      const variantsChanged = !this.areVariantsEqual(product.variants, body.variants)

      if (variantsChanged) {
        const activeSkuCount = await this.skuRepository.countActiveByProductId(id)

        if (activeSkuCount > 0) {
          throw new BadRequestException(MESSAGE.PRODUCT.CANNOT_UPDATE_VARIANTS_WITH_ACTIVE_SKUS)
        }
      }
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

      ...(body.variants !== undefined && {
        variants: body.variants,
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

  async uploadImage(id: number, file: Express.Multer.File, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    const uploadedFile = await this.storageService.upload(file, 'products')

    return this.productRepository.update(id, {
      images: {
        push: uploadedFile.url,
      },

      updatedBy: {
        connect: {
          id: userId,
        },
      },
    })
  }
}
