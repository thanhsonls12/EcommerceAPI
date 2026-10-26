import type { ReactNode } from 'react'
import { ArrowUpRight, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { date, discountPercent, initials, money, productImage, skuLabel } from '../lib'
import type { CartItem, GuestCartItem, Product, ProductVariant, ReviewResponse, Sku } from '../types'
import { Stars } from './ui'

export function ProductCard({ product }: { product: Product }) {
  const percent = discountPercent(product)
  return (
    <article className="group">
      <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-paper-deep">
        {percent > 0 ? (
          <span className="absolute left-3 top-3 z-10 bg-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white">
            -{percent}%
          </span>
        ) : null}
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-3 right-3 hidden items-center gap-1 bg-surface px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink group-hover:flex">
          Xem <ArrowUpRight size={12} />
        </span>
      </Link>
      <div className="mt-3 grid gap-1.5 border-t border-line pt-3">
        <span className="label-mono">{product.brand?.name || 'Electronics'}</span>
        <Link
          to={`/products/${product.id}`}
          className="line-clamp-2 text-[13px] font-medium leading-snug text-ink transition-colors hover:text-accent"
          title={product.name}
        >
          {product.name}
        </Link>
        <div className="flex flex-col items-start gap-0.5 font-mono sm:flex-row sm:items-baseline sm:gap-x-2">
          <strong className="text-[12px] font-medium text-ink sm:text-[13px]">{money(product.basePrice)}</strong>
          {percent > 0 ? (
            <del className="text-[10px] text-muted sm:text-[11px]">{money(product.virtualPrice)}</del>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function VariantPicker({
  variant,
  selected,
  onChange,
  skus,
}: {
  variant: ProductVariant
  selected?: string
  onChange: (value: string) => void
  skus: Sku[]
}) {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">{variant.name}</span>
        <span className="font-mono text-[10px] text-ink">{selected || 'Chưa chọn'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {variant.options.map((option) => {
          const available = skus.some((sku) => sku.value?.[variant.name] === option && sku.stock > 0)
          const isSelected = selected === option
          return (
            <button
              key={option}
              type="button"
              className={`min-h-10 rounded-sm border px-3.5 py-2 text-[12px] transition-colors ${
                isSelected
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-ink hover:text-ink'
              } ${!available ? 'cursor-not-allowed opacity-35 line-through' : ''}`}
              disabled={!available}
              aria-pressed={isSelected}
              title={!available ? 'Tạm hết hàng' : undefined}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ReviewCard({ review }: { review: ReviewResponse['data'][number] }) {
  return (
    <article className="grid gap-3 border-b border-line pb-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-sm border border-line bg-paper font-mono text-[10px] text-ink-soft">
          {initials(review.user?.name)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-[13px] font-semibold text-ink">{review.user?.name || 'Khách hàng'}</strong>
            <span className="font-mono text-[10px] text-muted">{date(review.createdAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Stars value={review.rating} />
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-success">Đã mua hàng</span>
          </div>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-soft">{review.content}</p>
      {review.medias?.length ? (
        <div className="flex gap-2">
          {review.medias.map((media) => (
            <img
              key={media.id || media.url}
              src={media.url}
              alt="Ảnh đánh giá"
              loading="lazy"
              decoding="async"
              className="h-16 w-16 border border-line object-cover"
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function CartLine({
  item,
  onUpdate,
  onRemove,
}: {
  item: CartItem | GuestCartItem
  onUpdate: (id: number, quantity: number) => Promise<void>
  onRemove: (id: number) => Promise<void>
}) {
  const product = 'product' in item ? item.product : item.sku?.product
  const sku = item.sku
  return (
    <article className="grid grid-cols-[80px_1fr] gap-4 border-b border-line py-5 sm:grid-cols-[96px_1fr_auto]">
      <img
        src={productImage(product, sku)}
        alt={product?.name || 'Sản phẩm'}
        decoding="async"
        className="h-20 w-20 border border-line bg-paper-deep object-contain p-2 sm:h-24 sm:w-24"
      />
      <div className="min-w-0">
        <Link
          to={`/products/${product?.id || ''}`}
          className="line-clamp-2 text-[13px] font-medium text-ink transition-colors hover:text-accent"
        >
          {product?.name || `Sản phẩm #${item.skuId}`}
        </Link>
        {sku ? <span className="mt-1 block font-mono text-[10px] text-muted">{skuLabel(sku)}</span> : null}
        <div className="mt-2 font-mono text-[13px] text-ink">{money(sku?.price)}</div>
        <div className="mt-3 flex items-center justify-between gap-4 sm:hidden">
          <QuantityStepper item={item} sku={sku} onUpdate={onUpdate} />
          <button
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-danger"
            onClick={() => void onRemove(item.skuId)}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      </div>
      <div className="hidden flex-col items-end justify-between sm:flex">
        <QuantityStepper item={item} sku={sku} onUpdate={onUpdate} />
        <button
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-danger"
          onClick={() => void onRemove(item.skuId)}
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>
    </article>
  )
}

function QuantityStepper({
  item,
  sku,
  onUpdate,
}: {
  item: CartItem | GuestCartItem
  sku?: Sku
  onUpdate: (id: number, quantity: number) => Promise<void>
}) {
  return (
    <div className="inline-flex h-10 items-center border border-line-strong bg-surface">
      <button
        className="grid h-full w-10 place-items-center text-muted transition-colors hover:bg-paper hover:text-ink"
        onClick={() => void onUpdate(item.skuId, Math.max(1, item.quantity - 1))}
        aria-label="Giảm số lượng"
      >
        <Minus size={14} />
      </button>
      <span className="w-9 text-center font-mono text-[12px] text-ink" aria-live="polite">
        {item.quantity}
      </span>
      <button
        className="grid h-full w-10 place-items-center text-muted transition-colors hover:bg-paper hover:text-ink"
        onClick={() => void onUpdate(item.skuId, Math.min(sku?.stock || 99, item.quantity + 1))}
        aria-label="Tăng số lượng"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function OrderSummary({
  subtotal,
  discount = 0,
  total = subtotal,
  action,
}: {
  subtotal: number
  discount?: number
  total?: number
  action?: ReactNode
}) {
  return (
    <aside className="border border-line bg-surface p-6 lg:sticky lg:top-24">
      <h2 className="border-b border-line pb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">
        Tóm tắt đơn hàng
      </h2>
      <div className="mt-4 grid gap-3 text-[13px]">
        <div className="flex justify-between gap-4 text-muted">
          <span>Tạm tính</span>
          <strong className="font-mono font-medium text-ink">{money(subtotal)}</strong>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-4 text-success">
            <span>Giảm giá</span>
            <strong className="font-mono font-medium">-{money(discount)}</strong>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 text-muted">
          <span>Vận chuyển</span>
          <span className="font-mono text-[11px]">Tính khi xác nhận</span>
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[13px] font-semibold text-ink">Tổng cộng</span>
          <strong className="font-mono text-xl font-medium text-accent">{money(total)}</strong>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted">Đã bao gồm VAT nếu có</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </aside>
  )
}
