import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
  {
    variants: {
      variant: {
        default: 'border-line bg-paper-deep text-ink-soft',
        accent: 'border-accent bg-accent text-white',
        success: 'border-success/30 bg-success-soft text-success',
        danger: 'border-danger/30 bg-danger-soft text-danger',
        outline: 'border-line-strong bg-transparent text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
