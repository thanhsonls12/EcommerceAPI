import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateOrderBodySchema = z
  .object({
    addressId: z.number().int().positive(),
    couponCode: z.string().trim().min(3).max(50).optional(),
  })
  .strict()

const GetOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export class CreateOrderBodyDTO extends createZodDto(CreateOrderBodySchema) {}
export class GetOrdersQueryDTO extends createZodDto(GetOrdersQuerySchema) {}
