import type { ReactNode } from 'react'
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { date, discountPercent, initials, money, productImage, skuLabel } from '../lib'
import type { CartItem, GuestCartItem, Product, ProductVariant, ReviewResponse, Sku } from '../types'
import { Stars } from './ui'

export function ProductCard({ product }: { product: Product }) {
  const percent = discountPercent(product)
  return (
    <article className="product-card group">
      <Link to={`/products/${product.id}`} className="product-card-image">
        {percent > 0 ? <span className="badge badge-sale">-{percent}%</span> : null}
        <img src={productImage(product)} alt={product.name} loading="lazy" />
        <span className="card-quick">
          Xem chi tiết <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
      <div className="product-card-body">
        <div className="eyebrow text-slate-400 font-semibold tracking-wider">
          {product.brand?.name || 'ELECTRONICS'}
        </div>
        <Link to={`/products/${product.id}`} className="product-name" title={product.name}>
          {product.name}
        </Link>
        <div className="price-row">
          <strong>{money(product.basePrice)}</strong>
          {percent > 0 ? <del>{money(product.virtualPrice)}</del> : null}
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
    <div className="variant-picker">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
        <span>{variant.name}:</span>
        <span className="text-blue-600 font-bold">{selected || 'Vui lòng chọn'}</span>
      </div>
      <div className="variant-options flex flex-wrap gap-2">
        {variant.options.map((option) => {
          const available = skus.some((sku) => sku.value?.[variant.name] === option && sku.stock > 0)
          const isSelected = selected === option
          return (
            <button
              key={option}
              type="button"
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-sm font-semibold ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              } ${!available ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
              disabled={!available}
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
    <article className="review-card p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shadow-inner">
          {initials(review.user?.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <strong className="text-sm font-semibold text-slate-900">{review.user?.name || 'Khách hàng'}</strong>
            <span className="text-xs text-slate-400">{date(review.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Stars value={review.rating} />
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Đã mua hàng
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pl-1">{review.content}</p>
      {review.medias?.length ? (
        <div className="review-media flex gap-2 pt-1 pl-1">
          {review.medias.map((media) => (
            <img
              key={media.id || media.url}
              src={media.url}
              alt="Ảnh đánh giá"
              className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-xs hover:scale-105 transition-transform"
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
    <article className="cart-line flex items-center gap-4 py-4 px-3 rounded-2xl transition-colors hover:bg-slate-50/70 border-b border-slate-100 last:border-0">
      <img
        src={productImage(product, sku)}
        alt={product?.name || 'Sản phẩm'}
        className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-100 p-2 shrink-0"
      />
      <div className="cart-line-copy flex-1 min-w-0">
        <Link
          to={`/products/${product?.id || ''}`}
          className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {product?.name || `Sản phẩm #${item.skuId}`}
        </Link>
        {sku ? (
          <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
            {skuLabel(sku)}
          </span>
        ) : null}
        <div className="mt-1.5 font-bold text-slate-900 text-sm">{money(sku?.price)}</div>
      </div>
      <div className="cart-line-actions flex flex-col items-end gap-3 shrink-0">
        <div className="quantity flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => void onUpdate(item.skuId, Math.max(1, item.quantity - 1))}
            aria-label="Giảm số lượng"
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Minus size={15} />
          </button>
          <span className="w-9 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
          <button
            onClick={() => void onUpdate(item.skuId, Math.min(sku?.stock || 99, item.quantity + 1))}
            aria-label="Tăng số lượng"
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
        <button
          className="remove-button inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          onClick={() => void onRemove(item.skuId)}
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>
    </article>
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
    <aside className="order-summary rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Tóm tắt đơn hàng</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Tạm tính</span>
          <strong className="text-slate-900 font-semibold">{money(subtotal)}</strong>
        </div>
        {discount > 0 ? (
          <div className="summary-discount flex justify-between text-emerald-600 font-medium">
            <span>Giảm giá khuyến mãi</span>
            <strong>-{money(discount)}</strong>
          </div>
        ) : null}
        <div className="flex justify-between text-slate-600">
          <span>Phí vận chuyển</span>
          <span className="text-slate-400 text-xs">Tính khi checkout</span>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <div className="summary-total flex justify-between items-baseline">
          <span className="font-semibold text-slate-800">Tổng cộng</span>
          <strong className="text-xl font-extrabold text-blue-600">{money(total)}</strong>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Đã bao gồm VAT nếu có</p>
      </div>
      {action}
    </aside>
  )
}
