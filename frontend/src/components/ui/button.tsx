import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-sans text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'border-ink bg-ink text-paper hover:border-ink-soft hover:bg-ink-soft',
        secondary: 'border-line-strong bg-transparent text-ink hover:border-ink hover:bg-surface',
        ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-paper-deep hover:text-ink',
        danger: 'border-danger bg-danger-soft text-danger hover:bg-danger hover:text-white',
        link: 'border-transparent bg-transparent p-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-[11px]',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-[13px]',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
