import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreatePromotionBodySchema = z
  .object({
    code: z.string().trim().min(3).max(50),

    name: z.string().trim().min(1).max(200),

    description: z.string().trim().max(2000).optional(),

    type: z.enum(['FIXED', 'PERCENT']),

    value: z.number().positive(),

    minOrderValue: z.number().nonnegative().optional(),

    maxDiscount: z.number().positive().optional(),

    usageLimit: z.number().int().positive().optional(),

    startsAt: z.coerce.date(),

    expiresAt: z.coerce.date(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.expiresAt <= data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'expiresAt must be after startsAt',
      })
    }

    if (data.type === 'PERCENT' && data.value > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Percentage discount cannot exceed 100',
      })
    }

    if (data.type === 'FIXED' && data.maxDiscount !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDiscount'],
        message: 'maxDiscount only applies to percentage promotions',
      })
    }
  })
const UpdatePromotionBodySchema = z
  .object({
    code: z.string().trim().min(3).max(50).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    type: z.enum(['FIXED', 'PERCENT']).optional(),
    value: z.number().positive().optional(),
    minOrderValue: z.number().nonnegative().nullable().optional(),
    maxDiscount: z.number().positive().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export class UpdatePromotionBodyDTO extends createZodDto(UpdatePromotionBodySchema) {}
export class CreatePromotionBodyDTO extends createZodDto(CreatePromotionBodySchema) {}
