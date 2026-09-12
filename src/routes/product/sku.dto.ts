import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const SKUValueSchema = z.record(z.string().trim().min(1), z.string().trim().min(1))

const CreateSKUBodySchema = z
  .object({
    value: SKUValueSchema,

    price: z.number().positive(),

    stock: z.number().int().nonnegative(),

    image: z.string().url().max(1000),
  })
  .strict()

const UpdateSKUBodySchema = CreateSKUBodySchema.partial()

export class CreateSKUBodyDTO extends createZodDto(CreateSKUBodySchema) {}

export class UpdateSKUBodyDTO extends createZodDto(UpdateSKUBodySchema) {}
