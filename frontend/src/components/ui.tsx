import type { ReactNode } from 'react'
import { LoaderCircle, ShoppingBag, Star } from 'lucide-react'
import { Button } from './ui/button'
import { EmptyState } from './ui/empty-state'
import { Skeleton } from './ui/skeleton'

export { Button } from './ui/button'
export { EmptyState } from './ui/empty-state'
export { Alert } from './ui/alert'
export { Badge } from './ui/badge'
export { Input } from './ui/input'
export { Textarea } from './ui/textarea'
export { Skeleton } from './ui/skeleton'

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className={`field grid gap-2 ${error ? 'has-error' : ''}`}>
      <span className="label-mono">{label}</span>
      {children}
      {hint && !error ? <small className="text-[11px] text-muted">{hint}</small> : null}
      {error ? <small className="text-[11px] text-danger">{error}</small> : null}
    </label>
  )
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-label={`${value.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={13}
          aria-hidden="true"
          className={star <= Math.round(value) ? 'fill-accent text-accent' : 'fill-paper-deep text-line-strong'}
        />
      ))}
      {count !== undefined ? <small className="ml-1.5 font-mono text-[10px] text-muted">({count})</small> : null}
    </span>
  )
}

export function ProductSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full" />
      <div className="mt-3 grid gap-2 border-t border-line pt-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[320px] place-items-center gap-3" role="status" aria-live="polite">
      <LoaderCircle size={22} className="animate-spin text-accent" aria-hidden="true" />
      <span className="label-mono">Đang tải…</span>
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Không tải được dữ liệu"
      text="Có lỗi kết nối với máy chủ. Vui lòng kiểm tra đường truyền và thử lại."
      icon={<ShoppingBag size={22} />}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại ngay
          </Button>
        ) : null
      }
    />
  )
}
