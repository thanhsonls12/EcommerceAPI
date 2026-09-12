import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const ProductVariantSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    options: z.array(z.string().trim().min(1).max(100)).min(1),
  })
  .strict()

const CreateProductBodySchema = z
  .object({
    name: z.string().min(1).max(500),

    basePrice: z.number().positive(),

    virtualPrice: z.number().positive(),

    brandId: z.number().int().positive(),

    categoryIds: z.array(z.number().int().positive()).min(1),

    variants: z.array(ProductVariantSchema).min(1).optional(),
  })
  .strict()

const UpdateProductBodySchema = CreateProductBodySchema.partial()

const GetProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    brandId: z.coerce.number().int().positive().optional(),

    categoryId: z.coerce.number().int().positive().optional(),

    minPrice: z.coerce.number().nonnegative().optional(),

    maxPrice: z.coerce.number().nonnegative().optional(),

    sortBy: z.enum(['price', 'createdAt']).default('createdAt'),

    sortOrder: z.enum(['asc', 'desc']).default('desc'),

    search: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export class GetProductsQueryDTO extends createZodDto(GetProductsQuerySchema) {}
export class UpdateProductBodyDTO extends createZodDto(UpdateProductBodySchema) {}
export class CreateProductBodyDTO extends createZodDto(CreateProductBodySchema) {}
