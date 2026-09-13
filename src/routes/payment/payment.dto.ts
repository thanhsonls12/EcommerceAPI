import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreatePaymentBodySchema = z
  .object({
    orderId: z.number().int().positive(),
  })
  .strict()

export class CreatePaymentBodyDTO extends createZodDto(CreatePaymentBodySchema) {}
