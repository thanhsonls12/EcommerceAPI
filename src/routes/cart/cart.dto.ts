import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const AddCartItemBodySchema = z
  .object({
    skuId: z.number().int().positive(),
    quantity: z.number().int().positive().max(99),
  })
  .strict()

const UpdateCartItemBodySchema = z
  .object({
    quantity: z.number().int().positive().max(99),
  })
  .strict()

export class AddCartItemBodyDTO extends createZodDto(AddCartItemBodySchema) {}

export class UpdateCartItemBodyDTO extends createZodDto(UpdateCartItemBodySchema) {}

const MergeCartBodySchema = z
  .object({
    items: z
      .array(AddCartItemBodySchema)
      .max(100)
      .refine((items) => new Set(items.map((item) => item.skuId)).size === items.length, {
        message: 'Duplicate SKU ids are not allowed',
      }),
  })
  .strict()

export class MergeCartBodyDTO extends createZodDto(MergeCartBodySchema) {}
