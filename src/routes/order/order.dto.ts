import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateOrderBodySchema = z
  .object({
    addressId: z.number().int().positive(),
    couponCode: z.string().trim().min(3).max(50).optional(),
  })
  .strict()

export class CreateOrderBodyDTO extends createZodDto(CreateOrderBodySchema) {}
