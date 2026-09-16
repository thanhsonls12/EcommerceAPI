import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { MESSAGE } from '@/shared/constants/message.constant'

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

const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(6).max(20),
    newPassword: z.string().min(6).max(20),
    confirmNewPassword: z.string().min(6).max(20),
  })
  .strict()
  .superRefine(({ newPassword, confirmNewPassword }, ctx) => {
    if (newPassword !== confirmNewPassword) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGE.VALIDATION.PASSWORD_CONFIRMATION_MISMATCH,
        path: ['confirmNewPassword'],
      })
    }
  })

const GetUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export class ChangePasswordBodyDTO extends createZodDto(ChangePasswordBodySchema) {}
export class UpdateProfileBodyDto extends createZodDto(UpdateProfileBodySchema) {}
export class GetUsersQueryDTO extends createZodDto(GetUsersQuerySchema) {}
