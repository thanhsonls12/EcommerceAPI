import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const alertVariants = cva('rounded-sm border px-3.5 py-3 text-[12px] leading-relaxed', {
  variants: {
    variant: {
      default: 'border-line bg-paper-deep text-ink',
      success: 'border-success/30 bg-success-soft text-success',
      error: 'border-danger/30 bg-danger-soft text-danger',
      info: 'border-line-strong bg-surface text-ink-soft',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div className={cn(alertVariants({ variant }), className)} {...props} />
}
