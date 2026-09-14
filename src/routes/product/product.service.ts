import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ProductRepository } from './product.repository'
import { BrandRepository } from '../brand/brand.repository'
import { CategoryRepository } from '../category/category.repository'
import { CreateProductBodyDTO, GetProductsQueryDTO, UpdateProductBodyDTO } from './product.dto'
import { Prisma } from '../../../generated/prisma/client'
import { SKURepository } from './sku.repository'
import { StorageService } from '@/shared/services/storage.service'
import { MESSAGE } from '@/shared/constants/message.constant'

import { CacheService } from '@/shared/services/cache.service'

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

  private async getProductListCacheVersion() {
    let version = await this.cacheService.getString('product:list:version')
    if (!version) {
      await this.cacheService.setString('product:list:version', '1')
      version = '1'
    }

    return version
  }

  private buildProductListCacheKey(version: string, query: GetProductsQueryDTO) {
    return [
      `product:list:v${version}`,
      `page=${query.page}`,
      `limit=${query.limit}`,
      `brand=${query.brandId ?? 'all'}`,
      `category=${query.categoryId ?? 'all'}`,
      `minPrice=${query.minPrice ?? 'none'}`,
      `maxPrice=${query.maxPrice ?? 'none'}`,
      `search=${query.search ?? 'none'}`,
      `sortBy=${query.sortBy}`,
      `sortOrder=${query.sortOrder}`,
    ].join(':')
  }

  private async invalidateProductListCache() {
    await this.cacheService.increment('product:list:version')
  }

  private async getProductDetailCacheVersion() {
    let version = await this.cacheService.getString('product:detail:version')

    if (!version) {
      await this.cacheService.setString('product:detail:version', '1')
      version = '1'
    }

    return version
  }

  private async invalidateProductDetailCache() {
    await this.cacheService.increment('product:detail:version')
  }
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly brandRepository: BrandRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly skuRepository: SKURepository,
    private readonly storageService: StorageService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(query: GetProductsQueryDTO) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new BadRequestException(MESSAGE.PRODUCT.MIN_PRICE_GREATER_THAN_MAX_PRICE)
    }

    const version = await this.getProductListCacheVersion()

    const cacheKey = this.buildProductListCacheKey(version, query)

    const cachedProducts = await this.cacheService.get(cacheKey)

    if (cachedProducts) {
      return cachedProducts
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
        const result = {
          data: [],
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        }

        await this.cacheService.set(cacheKey, result, 120)
        return result
      }

      const products = await this.productRepository.findManyByIds(ids)

      const productMap = new Map(products.map((product) => [product.id, product]))

      const sortedProducts = ids.map((id) => productMap.get(id)).filter((product) => product !== undefined)

      const result = {
        data: sortedProducts,

        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      }

      await this.cacheService.set(cacheKey, result, 120)

      return result
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

    const result = {
      data: products,

      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }

    await this.cacheService.set(cacheKey, result, 120)

    return result
  }

  async findById(id: number) {
    const version = await this.getProductDetailCacheVersion()
    const cacheKey = `product:detail:v${version}:${id}`
    const cachedProduct = await this.cacheService.get(cacheKey)
    if (cachedProduct) {
      return cachedProduct
    }
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    await this.cacheService.set(cacheKey, product, 300)

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

    const product = await this.productRepository.create({
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

    await this.invalidateProductListCache()

    return product
  }

  async delete(id: number, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    await this.productRepository.softDelete(id, userId)

    await this.invalidateProductListCache()
    await this.invalidateProductDetailCache()

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

    const updatedProduct = await this.productRepository.update(id, {
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

    await this.invalidateProductListCache()
    await this.invalidateProductDetailCache()

    return updatedProduct
  }

  async uploadImage(id: number, file: Express.Multer.File, userId: number) {
    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    const uploadedFile = await this.storageService.upload(file, 'products')

    const updatedProduct = await this.productRepository.update(id, {
      images: {
        push: uploadedFile.url,
      },

      updatedBy: {
        connect: {
          id: userId,
        },
      },
    })

    await this.invalidateProductListCache()
    await this.invalidateProductDetailCache()

    return updatedProduct
  }
}
