import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const UpdateProfileBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phoneNumber: z
      .string()
      .length(10)
      .regex(/^0[3579][0-9]{8}$/)
      .optional(),
    avatar: z.string().url().nullable().optional(),
  })
  .strict()

export class UpdateProfileBodyDto extends createZodDto(UpdateProfileBodySchema) {}
