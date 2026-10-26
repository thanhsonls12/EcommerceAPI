import type { ReactNode } from 'react'
import { ShoppingBag } from 'lucide-react'
import { cn } from '../../lib/utils'

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  text: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-3 border border-dashed border-line-strong bg-surface px-6 py-16 text-center',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center border border-line bg-paper text-accent">
        {icon || <ShoppingBag size={22} />}
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">{text}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
