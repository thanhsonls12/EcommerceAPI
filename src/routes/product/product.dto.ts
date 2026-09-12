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

    images: z.array(z.string().url().max(1000)).min(1),

    variants: z.array(ProductVariantSchema).min(1).optional(),
  })
  .strict()

const UpdateProductBodySchema = CreateProductBodySchema.partial()

export class UpdateProductBodyDTO extends createZodDto(UpdateProductBodySchema) {}
export class CreateProductBodyDTO extends createZodDto(CreateProductBodySchema) {}
