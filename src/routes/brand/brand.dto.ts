import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateBrandBodySchema = z
  .object({
    name: z.string().min(1).max(500),
    logo: z.string().url().max(1000),
  })
  .strict()

const UpdateBrandBodySchema = CreateBrandBodySchema.partial()

export class CreateBrandBodyDTO extends createZodDto(CreateBrandBodySchema) {}

export class UpdateBrandBodyDTO extends createZodDto(UpdateBrandBodySchema) {}
