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
    <span className="rating" aria-label={`${value.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={14} fill={star <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
      {count !== undefined ? <small>({count})</small> : null}
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
    <div className="empty-state">
      {icon || <ShoppingBag size={28} />}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-short" />
    </div>
  )
}
export function PageLoader() {
  return (
    <div className="page-loader">
      <LoaderCircle className="spin" size={32} />
      <span>Đang tải cửa hàng…</span>
    </div>
  )
}
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Không tải được dữ liệu"
      text="Có lỗi kết nối. Bạn có thể thử lại ngay."
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        ) : null
      }
    />
  )
}
