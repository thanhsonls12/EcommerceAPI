import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { UserStatus } from '../../../generated/prisma/enums'

const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  phoneNumber: z.string(),
  avatar: z.string().nullable(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED]),
  roleId: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
})

const RegisterBodySchema = z
  .object({
    email: z.email(),
    password: z.string().min(6).max(20),
    name: z.string().min(1).max(100),
    confirmPassword: z.string().min(6).max(20),
    phoneNumber: z
      .string()
      .length(10, 'Phone number must be 10 digits')
      .regex(/^0[35789][0-9]{8}$/),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password and confirm password must match',
        path: ['confirmPassword'],
      })
    }
  })

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

export class RegisterResDTO extends createZodDto(UserSchema) {}
