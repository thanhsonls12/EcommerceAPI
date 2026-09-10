import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { UserStatus } from '../../../generated/prisma/enums'
import { MESSAGE } from '@/shared/constants/message.constant'

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

const LoginResSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
})

const RefreshTokenResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

const LogoutResSchema = z.object({
  message: z.string(),
})

const VerifyEmailResSchema = z.object({
  message: z.string(),
})

const RegisterBodySchema = z
  .object({
    email: z.email(),
    password: z.string().min(6).max(20),
    name: z.string().min(1).max(100),
    confirmPassword: z.string().min(6).max(20),
    phoneNumber: z
      .string()
      .length(10, MESSAGE.VALIDATION.PHONE_NUMBER_LENGTH)
      .regex(/^0[35789][0-9]{8}$/),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGE.VALIDATION.PASSWORD_CONFIRMATION_MISMATCH,
        path: ['confirmPassword'],
      })
    }
  })

const LoginBodySchema = z
  .object({
    email: z.email(),
    password: z.string().min(6).max(20),
  })
  .strict()

const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(1, MESSAGE.VALIDATION.REFRESH_TOKEN_REQUIRED),
  })
  .strict()

const LogoutBodySchema = z
  .object({
    refreshToken: z.string().min(1, MESSAGE.VALIDATION.REFRESH_TOKEN_REQUIRED),
  })
  .strict()

const VerifyEmailBodySchema = z
  .object({
    email: z.email(),
    code: z.string().length(6, MESSAGE.VALIDATION.VERIFICATION_CODE_LENGTH),
  })
  .strict()

const ResendVerificationCodeBodySchema = z.object({
  email: z.email(),
})

const ResendVerificationCodeResSchema = z.object({
  message: z.string(),
})

const ForgotPasswordBodySchema = z.object({
  email: z.email(),
})

const ForgotPasswordResSchema = z.object({
  message: z.string(),
})

const ResetPasswordBodySchema = z
  .object({
    email: z.email(),
    code: z.string().length(6, MESSAGE.VALIDATION.RESET_CODE_LENGTH),
    password: z.string().min(6).max(20),
    confirmPassword: z.string().min(6).max(20),
  })
  .strict()
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGE.VALIDATION.PASSWORD_CONFIRMATION_MISMATCH,
        path: ['confirmPassword'],
      })
    }
  })

const ResetPasswordResSchema = z.object({
  message: z.string(),
})

const EnableTwoFactorBodySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict()

export class EnableTwoFactorBodyDTO extends createZodDto(EnableTwoFactorBodySchema) {}

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

export class RegisterResDTO extends createZodDto(UserSchema) {}

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}

export class LoginResDTO extends createZodDto(LoginResSchema) {}

export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}

export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}

export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

export class LogoutResDTO extends createZodDto(LogoutResSchema) {}

export class VerifyEmailBodyDTO extends createZodDto(VerifyEmailBodySchema) {}

export class VerifyEmailResDTO extends createZodDto(VerifyEmailResSchema) {}

export class ResendVerificationCodeBodyDTO extends createZodDto(ResendVerificationCodeBodySchema) {}

export class ResendVerificationCodeResDTO extends createZodDto(ResendVerificationCodeResSchema) {}

export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordBodySchema) {}

export class ForgotPasswordResDTO extends createZodDto(ForgotPasswordResSchema) {}

export class ResetPasswordBodyDTO extends createZodDto(ResetPasswordBodySchema) {}

export class ResetPasswordResDTO extends createZodDto(ResetPasswordResSchema) {}
