import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const ReceiverSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phoneNumber: z.string().trim().min(8).max(20),
    address: z.string().trim().min(1).max(500),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

const CreateOrderBodySchema = z
  .object({
    receiver: ReceiverSchema,
  })
  .strict()

export class CreateOrderBodyDTO extends createZodDto(CreateOrderBodySchema) {}
