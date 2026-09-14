import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const CreateReviewBodySchema = z
  .object({
    orderId: z.number().int().positive(),
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    content: z.string().trim().min(1).max(2000),
  })
  .strict()

const GetReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const UpdateReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    content: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((data) => data.rating !== undefined || data.content !== undefined, {
    message: 'At least one field must be provided',
  })

export class UpdateReviewBodyDTO extends createZodDto(UpdateReviewBodySchema) {}

export class GetReviewsQueryDTO extends createZodDto(GetReviewsQuerySchema) {}

export class CreateReviewBodyDTO extends createZodDto(CreateReviewBodySchema) {}
