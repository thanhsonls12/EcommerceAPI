import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateAddressBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phoneNumber: z.string().trim().min(8).max(20),
    address: z.string().trim().min(1).max(500),
    note: z.string().trim().max(500).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()

const UpdateAddressBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phoneNumber: z.string().trim().min(8).max(20).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    note: z.string().trim().max(500).optional(),
    isDefault: z.literal(true).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export class CreateAddressBodyDTO extends createZodDto(CreateAddressBodySchema) {}

export class UpdateAddressBodyDTO extends createZodDto(UpdateAddressBodySchema) {}
