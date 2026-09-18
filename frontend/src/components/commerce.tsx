import type { ReactNode } from 'react'
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { date, discountPercent, initials, money, productImage, skuLabel } from '../lib'
import type { CartItem, GuestCartItem, Product, ProductVariant, ReviewResponse, Sku } from '../types'
import { Stars } from './ui'

export function ProductCard({ product }: { product: Product }) {
  const percent = discountPercent(product)
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-image">
        {percent > 0 ? <span className="badge badge-sale">-{percent}%</span> : null}
        <img src={productImage(product)} alt={product.name} loading="lazy" />
        <span className="card-quick">
          Xem chi tiết <ArrowRight size={14} />
        </span>
      </Link>
      <div className="product-card-body">
        <div className="eyebrow">{product.brand?.name || 'ELECTRONICS'}</div>
        <Link to={`/products/${product.id}`} className="product-name">
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
      <div>
        <strong>{variant.name}</strong>
        <span>{selected || 'Chưa chọn'}</span>
      </div>
      <div className="variant-options">
        {variant.options.map((option) => {
          const available = skus.some((sku) => sku.value?.[variant.name] === option && sku.stock > 0)
          return (
            <button
              key={option}
              className={selected === option ? 'selected' : ''}
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
    <article className="review-card">
      <div className="review-avatar">{initials(review.user?.name)}</div>
      <div>
        <div className="review-head">
          <strong>{review.user?.name || 'Khách hàng'}</strong>
          <span>{date(review.createdAt)}</span>
        </div>
        <Stars value={review.rating} />
        <p>{review.content}</p>
        {review.medias?.length ? (
          <div className="review-media">
            {review.medias.map((media) => (
              <img key={media.id || media.url} src={media.url} alt="Ảnh đánh giá" />
            ))}
          </div>
        ) : null}
      </div>
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
    <article className="cart-line">
      <img src={productImage(product, sku)} alt={product?.name || 'Sản phẩm'} />
      <div className="cart-line-copy">
        <Link to={`/products/${product?.id || ''}`}>{product?.name || `Sản phẩm #${item.skuId}`}</Link>
        <small>{skuLabel(sku)}</small>
        <strong>{money(sku?.price)}</strong>
      </div>
      <div className="cart-line-actions">
        <div className="quantity">
          <button onClick={() => void onUpdate(item.skuId, Math.max(1, item.quantity - 1))} aria-label="Giảm số lượng">
            <Minus size={15} />
          </button>
          <span>{item.quantity}</span>
          <button
            onClick={() => void onUpdate(item.skuId, Math.min(sku?.stock || 99, item.quantity + 1))}
            aria-label="Tăng số lượng"
          >
            <Plus size={15} />
          </button>
        </div>
        <button className="remove-button" onClick={() => void onRemove(item.skuId)}>
          <Trash2 size={16} /> Xóa
        </button>
      </div>
    </article>
  )
}

export function OrderSummary({ subtotal, action }: { subtotal: number; action?: ReactNode }) {
  return (
    <aside className="order-summary">
      <h2>Tóm tắt đơn hàng</h2>
      <div>
        <span>Tạm tính</span>
        <strong>{money(subtotal)}</strong>
      </div>
      <div>
        <span>Phí giao hàng</span>
        <span className="muted">Tính khi checkout</span>
      </div>
      <hr />
      <div className="summary-total">
        <span>Tổng cộng</span>
        <strong>{money(subtotal)}</strong>
      </div>
      {action}
    </aside>
  )
}
