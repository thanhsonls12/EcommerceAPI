import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 font-sans text-[13px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
