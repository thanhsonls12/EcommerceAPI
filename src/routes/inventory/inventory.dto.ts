import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const AdjustInventoryBodySchema = z
  .object({
    skuId: z.number().int().positive(),
    quantity: z.number().int(),
    type: z.enum(['RESTOCK', 'ADJUSTMENT']),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === 'RESTOCK' && data.quantity <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Restock quantity must be greater than zero',
      })
    }

    if (data.type === 'ADJUSTMENT' && data.quantity === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Adjustment quantity must not be zero',
      })
    }
  })

const LowStockQuerySchema = z
  .object({
    threshold: z.coerce.number().int().nonnegative().max(1_000_000).default(10),
  })
  .strict()

const InventoryHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export class AdjustInventoryBodyDTO extends createZodDto(AdjustInventoryBodySchema) {}
export class LowStockQueryDTO extends createZodDto(LowStockQuerySchema) {}
export class InventoryHistoryQueryDTO extends createZodDto(InventoryHistoryQuerySchema) {}
