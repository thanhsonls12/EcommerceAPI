import type { ReactNode } from 'react'
import { LoaderCircle, ShoppingBag, Star } from 'lucide-react'

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
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && !error ? <small>{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  onClick,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <LoaderCircle size={16} className="spin" /> : null}
      {children}
    </button>
  )
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span
      className="rating inline-flex items-center gap-1 text-amber-400"
      aria-label={`${value.toFixed(1)} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}
        />
      ))}
      {count !== undefined ? <small className="text-slate-500 font-medium ml-1">({count})</small> : null}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white/60 backdrop-blur-sm shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
        {icon || <ShoppingBag size={30} />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">{text}</p>
      {action}
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card animate-pulse">
      <div className="skeleton skeleton-image bg-slate-100 aspect-square w-full rounded-t-xl" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-4/5 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="h-5 w-24 bg-slate-200 rounded pt-2" />
      </div>
    </div>
  )
}
export function PageLoader() {
  return (
    <div className="page-loader min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-600">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
      </div>
      <span className="text-sm font-medium text-slate-500 tracking-wide">Đang tải cửa hàng…</span>
    </div>
  )
}
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Không tải được dữ liệu"
      text="Có lỗi kết nối với máy chủ. Vui lòng kiểm tra đường truyền và thử lại."
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
