import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { SKURepository } from './sku.repository'
import { ProductRepository } from './product.repository'
import { Prisma } from '../../../generated/prisma/client'
import { CreateSKUBodyDTO, UpdateSKUBodyDTO } from './sku.dto'
import { MESSAGE } from '@/shared/constants/message.constant'

type ProductVariant = {
  name: string
  options: string[]
}

@Injectable()
export class SKUService {
  constructor(
    private readonly skuRepository: SKURepository,
    private readonly productRepository: ProductRepository,
  ) {}

  private getProductVariants(variants: Prisma.JsonValue | null): ProductVariant[] {
    if (variants === null) return []
    if (!Array.isArray(variants)) {
      throw new BadRequestException(MESSAGE.SKU.INVALID_PRODUCT_VARIANTS)
    }
    return variants as ProductVariant[]
  }

  private normalizeSKUValue(value: Record<string, string>, variants: ProductVariant[]): Record<string, string> {
    const valueKeys = Object.keys(value)

    if (valueKeys.length !== variants.length) {
      throw new BadRequestException(MESSAGE.SKU.VALUE_DOES_NOT_MATCH_PRODUCT_VARIANTS)
    }

    const normalizedValue: Record<string, string> = {}

    for (const variant of variants) {
      const matchedKey = valueKeys.find((key) => key.toLowerCase() === variant.name.toLowerCase())
      if (!matchedKey) {
        throw new BadRequestException(MESSAGE.SKU.MISSING_VARIANT(variant.name))
      }
      const submittedOption = value[matchedKey]

      const matchedOption = variant.options.find((option) => option.toLowerCase() === submittedOption.toLowerCase())

      if (!matchedOption) {
        throw new BadRequestException(MESSAGE.SKU.INVALID_OPTION_FOR_VARIANT(submittedOption, variant.name))
      }
      normalizedValue[variant.name] = matchedOption
    }

    return normalizedValue
  }

  private canonicalizeSKUValue(value: Record<string, string>) {
    return Object.entries(value)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, option]) => `${key.toLowerCase()}:${option.toLowerCase()}`)
      .join('|')
  }

  private async ensureUniqueSKUValue(productId: number, value: Record<string, string>, excludeSkuId?: number) {
    const skus = await this.skuRepository.findManyByProductId(productId)

    const targetValue = this.canonicalizeSKUValue(value)

    const duplicatedSku = skus.find((sku) => {
      if (sku.id === excludeSkuId) {
        return false
      }

      if (typeof sku.value !== 'object' || sku.value === null || Array.isArray(sku.value)) {
        return false
      }

      return this.canonicalizeSKUValue(sku.value as Record<string, string>) === targetValue
    })

    if (duplicatedSku) {
      throw new BadRequestException(MESSAGE.SKU.VARIANT_COMBINATION_ALREADY_EXISTS)
    }
  }

  async findAll(productId: number) {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    return this.skuRepository.findManyByProductId(productId)
  }

  async findById(productId: number, skuId: number) {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    const sku = await this.skuRepository.findByIdAndProductId(skuId, productId)

    if (!sku) {
      throw new NotFoundException(MESSAGE.SKU.NOT_FOUND)
    }

    return sku
  }

  async create(productId: number, body: CreateSKUBodyDTO, userId: number) {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    const variants = this.getProductVariants(product.variants)

    const value = this.normalizeSKUValue(body.value, variants)

    await this.ensureUniqueSKUValue(productId, value)

    return this.skuRepository.create({
      value,
      price: body.price,
      stock: body.stock,
      image: body.image,

      product: {
        connect: {
          id: productId,
        },
      },

      createdBy: {
        connect: {
          id: userId,
        },
      },
    })
  }
  async update(productId: number, skuId: number, body: UpdateSKUBodyDTO, userId: number) {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new NotFoundException(MESSAGE.PRODUCT.NOT_FOUND)
    }

    const sku = await this.skuRepository.findByIdAndProductId(skuId, productId)

    if (!sku) {
      throw new NotFoundException(MESSAGE.SKU.NOT_FOUND)
    }

    let value: Record<string, string> | undefined

    if (body.value !== undefined) {
      const variants = this.getProductVariants(product.variants)
      value = this.normalizeSKUValue(body.value, variants)
      await this.ensureUniqueSKUValue(productId, value, skuId)
    }

    return this.skuRepository.update(skuId, {
      ...(value !== undefined && { value }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.image !== undefined && { image: body.image }),

      updatedBy: {
        connect: {
          id: userId,
        },
      },
    })
  }

  async delete(productId: number, skuId: number, userId: number) {
    const sku = await this.skuRepository.findByIdAndProductId(skuId, productId)

    if (!sku) {
      throw new NotFoundException(MESSAGE.SKU.NOT_FOUND)
    }

    await this.skuRepository.softDelete(skuId, userId)

    return {
      message: MESSAGE.SKU.DELETED_SUCCESSFULLY,
    }
  }
}
