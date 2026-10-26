import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

const sheetVariants = cva('fixed z-50 flex flex-col gap-5 border-line bg-surface p-5 shadow-lift focus:outline-none', {
  variants: {
    side: {
      bottom:
        'inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border-t data-[state=open]:animate-[sheet-in-bottom_240ms_ease-out]',
      right:
        'inset-y-0 right-0 h-full w-full max-w-sm border-l data-[state=open]:animate-[sheet-in-right_240ms_ease-out]',
      left: 'inset-y-0 left-0 h-full w-full max-w-sm border-r data-[state=open]:animate-[sheet-in-left_240ms_ease-out]',
    },
  },
  defaultVariants: { side: 'right' },
})

export function SheetContent({
  className,
  children,
  side,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-fade" />
      <DialogPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center text-muted transition-colors hover:text-ink"
          aria-label="Đóng"
        >
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-1.5 pr-10', className)} {...props} />
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-lg font-semibold tracking-[-0.03em] text-ink', className)} {...props} />
  )
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-[12px] text-muted', className)} {...props} />
}
