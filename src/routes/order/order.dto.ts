import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateOrderBodySchema = z
  .object({
    addressId: z.number().int().positive(),
  })
  .strict()

export class CreateOrderBodyDTO extends createZodDto(CreateOrderBodySchema) {}
