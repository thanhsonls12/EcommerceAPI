import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateCategoryBodySchema = z
  .object({
    name: z.string().min(1).max(500),
    logo: z.string().url().nullable().optional(),
    parentCategoryId: z.number().int().positive().nullable().optional(),
  })
  .strict()

const UpdateCategoryBodySchema = CreateCategoryBodySchema.partial()

export class CreateCategoryBodyDTO extends createZodDto(CreateCategoryBodySchema) {}
export class UpdateCategoryBodyDTO extends createZodDto(UpdateCategoryBodySchema) {}
