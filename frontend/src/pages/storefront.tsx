import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { discountPercent, money, productImage } from '../lib'
import { useCommerce } from '../app-context'
import { Button, EmptyState, ErrorState, PageLoader, ProductSkeleton, Stars } from '../components/ui'
import { CartLine, OrderSummary, ProductCard, ReviewCard, VariantPicker } from '../components/commerce'
import type { Brand, Category, Product, ProductListResponse, ReviewResponse, Sku } from '../types'

export function HomePage() {
  const products = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => api<ProductListResponse>('/products?page=1&limit=8&sortBy=createdAt&sortOrder=desc', false),
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories', false) })
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">THE EVERYDAY UPGRADE</span>
          <h1>
            Công nghệ tốt hơn cho những ngày <em>đẹp hơn.</em>
          </h1>
          <p>Chọn những thiết bị được tuyển kỹ, giá minh bạch và giao tới bạn thật gọn gàng.</p>
          <div className="hero-actions">
            <Link to="/products" className="button button-primary">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
            <a href="#benefits" className="text-link">
              Vì sao Élan? <ChevronRight size={16} />
            </a>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-device">
            <img src="https://placehold.co/720x720/1d2433/f4f1eb?text=E" alt="Thiết bị điện tử nổi bật" />
          </div>
          <span className="floating-note note-top">
            01 / 04
            <br />
            <strong>curated tech</strong>
          </span>
          <span className="floating-note note-bottom">
            Thiết kế để
            <br />
            <strong>dùng mỗi ngày</strong>
          </span>
        </div>
      </section>
      <section className="section category-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">SHOP BY MOOD</span>
            <h2>Tìm đúng thứ bạn cần</h2>
          </div>
          <Link to="/products" className="text-link">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        <div className="category-grid">
          {(categories.data || []).slice(0, 5).map((category, index) => (
            <Link
              to={`/products?categoryId=${category.id}`}
              className={`category-card category-${index % 5}`}
              key={category.id}
            >
              <span>0{index + 1}</span>
              <strong>{category.name}</strong>
              <small>
                Khám phá ngay <ArrowRight size={13} />
              </small>
            </Link>
          ))}
          {categories.isLoading
            ? [1, 2, 3, 4].map((item) => <div className="category-card skeleton" key={item} />)
            : null}
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">JUST IN</span>
            <h2>Mới trong cửa hàng</h2>
          </div>
          <Link to="/products?sortBy=createdAt" className="text-link">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        {products.isError ? (
          <ErrorState onRetry={() => void products.refetch()} />
        ) : (
          <div className="product-grid">
            {products.isLoading
              ? [1, 2, 3, 4].map((item) => <ProductSkeleton key={item} />)
              : (products.data?.data || []).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
      <section className="benefits" id="benefits">
        <div className="benefits-inner">
          <div>
            <ShieldCheck size={22} />
            <strong>Chọn kỹ, dùng lâu</strong>
            <p>Thông tin rõ ràng, không phức tạp hóa quyết định.</p>
          </div>
          <div>
            <Truck size={22} />
            <strong>Giao hàng minh bạch</strong>
            <p>Theo dõi từng bước từ lúc đặt tới lúc nhận.</p>
          </div>
          <div>
            <Heart size={22} />
            <strong>Hỗ trợ thật lòng</strong>
            <p>Cần giúp chọn đúng? Chúng mình luôn ở đây.</p>
          </div>
        </div>
      </section>
    </>
  )
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const search = params.get('search') || ''
  const positiveIntParam = (key: string) => {
    const raw = params.get(key)
    if (!raw) return ''
    const value = Number(raw)
    return Number.isSafeInteger(value) && value > 0 ? String(value) : ''
  }
  const nonNegativeNumberParam = (key: string) => {
    const raw = params.get(key)
    if (!raw) return ''
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 ? String(value) : ''
  }
  const categoryId = positiveIntParam('categoryId')
  const brandId = positiveIntParam('brandId')
  const minPrice = nonNegativeNumberParam('minPrice')
  const maxPrice = nonNegativeNumberParam('maxPrice')
  const sortBy = params.get('sortBy') === 'price' ? 'price' : 'createdAt'
  const sortOrder = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const parsedPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const apiParams = new URLSearchParams({ page: String(page), limit: '12', sortBy, sortOrder })
  if (search) apiParams.set('search', search)
  if (categoryId) apiParams.set('categoryId', categoryId)
  if (brandId) apiParams.set('brandId', brandId)
  if (minPrice) apiParams.set('minPrice', minPrice)
  if (maxPrice) apiParams.set('maxPrice', maxPrice)
  const query = `/products?${apiParams.toString()}`
  const products = useQuery({ queryKey: ['products', query], queryFn: () => api<ProductListResponse>(query, false) })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories', false) })
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api<Brand[]>('/brands', false) })
  const selectedCategory = categories.data?.find((category) => String(category.id) === categoryId)?.name
  const selectedBrand = brands.data?.find((brand) => String(brand.id) === brandId)?.name
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next)
  }
  return (
    <section className="page-section catalog-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={14} />
        <span>Sản phẩm</span>
      </div>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">THE COLLECTION</span>
          <h1>{search ? `Kết quả cho “${search}”` : 'Tất cả sản phẩm'}</h1>
          <p>{products.data?.pagination.total || 0} sản phẩm được tuyển chọn</p>
        </div>
        <button className="filter-toggle" onClick={() => setFilterOpen(true)}>
          Bộ lọc <ChevronDown size={16} />
        </button>
      </div>
      <div className="catalog-layout">
        <aside className={`filter-panel ${filterOpen ? 'open' : ''}`}>
          <div className="filter-mobile-head">
            <strong>Bộ lọc</strong>
            <button onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc">
              <X size={20} />
            </button>
          </div>
          <FilterGroup title="Danh mục">
            <button
              className={!categoryId ? 'filter-active' : ''}
              onClick={() => {
                setParam('categoryId', '')
                setFilterOpen(false)
              }}
            >
              Tất cả danh mục
            </button>
            {categories.data?.map((category) => (
              <button
                className={String(category.id) === categoryId ? 'filter-active' : ''}
                key={category.id}
                onClick={() => {
                  setParam('categoryId', String(category.id))
                  setFilterOpen(false)
                }}
              >
                {category.name}
              </button>
            ))}
          </FilterGroup>
          <FilterGroup title="Thương hiệu">
            <button
              className={!brandId ? 'filter-active' : ''}
              onClick={() => {
                setParam('brandId', '')
                setFilterOpen(false)
              }}
            >
              Tất cả thương hiệu
            </button>
            {brands.data?.map((brand) => (
              <button
                className={String(brand.id) === brandId ? 'filter-active' : ''}
                key={brand.id}
                onClick={() => {
                  setParam('brandId', String(brand.id))
                  setFilterOpen(false)
                }}
              >
                {brand.name}
              </button>
            ))}
          </FilterGroup>
          <div className="price-filter">
            <strong>Khoảng giá</strong>
            <div className="price-filter-fields">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setParam('minPrice', event.target.value)}
                placeholder="Từ"
                aria-label="Giá từ"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setParam('maxPrice', event.target.value)}
                placeholder="Đến"
                aria-label="Giá đến"
              />
            </div>
          </div>
          {categoryId || brandId || search || minPrice || maxPrice ? (
            <Button
              variant="ghost"
              className="clear-filter"
              onClick={() => {
                setParams({})
                setFilterOpen(false)
              }}
            >
              Xóa bộ lọc
            </Button>
          ) : null}
        </aside>
        {filterOpen ? (
          <button className="filter-scrim" onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc" />
        ) : null}
        <div className="catalog-results">
          <div className="results-toolbar">
            <div className="active-filters">
              {selectedCategory ? (
                <span>
                  {selectedCategory}
                  <button onClick={() => setParam('categoryId', '')}>×</button>
                </span>
              ) : null}
              {selectedBrand ? (
                <span>
                  {selectedBrand}
                  <button onClick={() => setParam('brandId', '')}>×</button>
                </span>
              ) : null}
            </div>
            <label className="sort-select">
              <span>Sắp xếp</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(event) => {
                  const [nextSort, nextOrder] = event.target.value.split(':')
                  const next = new URLSearchParams(params)
                  next.set('sortBy', nextSort)
                  next.set('sortOrder', nextOrder)
                  next.delete('page')
                  setParams(next)
                }}
              >
                <option value="createdAt:desc">Mới nhất</option>
                <option value="price:asc">Giá thấp đến cao</option>
                <option value="price:desc">Giá cao đến thấp</option>
              </select>
            </label>
          </div>
          {products.isError ? (
            <ErrorState onRetry={() => void products.refetch()} />
          ) : products.isLoading ? (
            <div className="product-grid">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <ProductSkeleton key={item} />
              ))}
            </div>
          ) : products.data?.data.length ? (
            <div className="product-grid">
              {products.data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa tìm thấy sản phẩm"
              text="Thử xóa bớt bộ lọc hoặc tìm một từ khóa khác nhé."
              action={
                <Button variant="secondary" onClick={() => setParams({})}>
                  Xóa bộ lọc
                </Button>
              }
            />
          )}
          {products.data?.pagination.totalPages && products.data.pagination.totalPages > 1 ? (
            <Pagination
              pagination={products.data.pagination}
              onChange={(nextPage) => {
                const next = new URLSearchParams(params)
                next.set('page', String(nextPage))
                setParams(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="filter-group">
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  )
}
function Pagination({
  pagination,
  onChange,
}: {
  pagination: { page: number; totalPages: number }
  onChange: (page: number) => void
}) {
  return (
    <div className="pagination">
      <button disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)} aria-label="Trang trước">
        <ChevronLeft size={18} />
      </button>
      <span>
        Trang {pagination.page} / {pagination.totalPages}
      </span>
      <button
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onChange(pagination.page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams()
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`, false),
    enabled: Boolean(id),
  })
  const skuQuery = useQuery({
    queryKey: ['skus', id],
    queryFn: () => api<Sku[]>(`/products/${id}/skus`, false),
    enabled: Boolean(id),
  })
  const reviews = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api<ReviewResponse>(`/reviews/product/${id}?page=1&limit=5`, false),
    enabled: Boolean(id),
  })
  const { addToCart } = useCommerce()
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const product = productQuery.data
  const skus = useMemo(() => skuQuery.data ?? [], [skuQuery.data])
  const variants = useMemo(() => product?.variants ?? [], [product?.variants])
  const selectedSku = useMemo(
    () =>
      skus.find((sku) =>
        variants.every((variant) => selected[variant.name] && sku.value?.[variant.name] === selected[variant.name]),
      ) || (variants.length ? undefined : skus[0]),
    [selected, skus, variants],
  )
  const images = useMemo(() => {
    if (!product) return []
    const candidates = [...(product.images || []), ...(product.medias || []).map((media) => media.url)]
    const unique = [...new Set(candidates.filter(Boolean))]
    return unique.length ? unique : [productImage(product)]
  }, [product])
  if (productQuery.isLoading) return <PageLoader />
  if (productQuery.isError || !product) return <ErrorState onRetry={() => void productQuery.refetch()} />
  return (
    <section className="page-section detail-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link to="/products">Sản phẩm</Link>
        <ChevronRight size={14} />
        <span>{product.name}</span>
      </div>
      <div className="detail-layout">
        <div className="gallery">
          <div className="gallery-main">
            <img src={images[imageIndex]} alt={product.name} />
          </div>
          <div className="gallery-thumbs">
            {images.map((image, index) => (
              <button className={index === imageIndex ? 'active' : ''} onClick={() => setImageIndex(index)} key={image}>
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-copy">
          <div className="eyebrow">{product.brand?.name || 'ÉLAN COLLECTION'}</div>
          <h1>{product.name}</h1>
          <div className="detail-rating">
            <Stars value={reviews.data?.rating.average || 0} count={reviews.data?.rating.count || 0} />
            <a href="#reviews">Đọc đánh giá</a>
          </div>
          <div className="detail-price">
            <strong>{money(selectedSku?.price ?? product.basePrice)}</strong>
            {discountPercent(product) > 0 ? <del>{money(product.virtualPrice)}</del> : null}
          </div>
          <p className="detail-intro">
            {product.productTranslations?.[0]?.description ||
              'Thiết kế tinh gọn, hiệu năng đáng tin cậy cho nhịp sống hàng ngày của bạn.'}
          </p>
          {variants.map((variant) => (
            <VariantPicker
              key={variant.name}
              variant={variant}
              selected={selected[variant.name]}
              onChange={(value) => setSelected((current) => ({ ...current, [variant.name]: value }))}
              skus={skus}
            />
          ))}
          <div className="stock-line">
            {selectedSku ? (
              selectedSku.stock > 0 ? (
                <>
                  <span className="stock-dot" /> Còn {selectedSku.stock} sản phẩm
                </>
              ) : (
                <span className="danger-text">Tạm hết hàng</span>
              )
            ) : variants.length ? (
              'Chọn đủ phiên bản để xem tồn kho'
            ) : (
              'Đang kiểm tra tồn kho'
            )}
          </div>
          <div className="buy-row">
            <div className="quantity">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng">
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(selectedSku?.stock || 99, value + 1))}
                aria-label="Tăng số lượng"
              >
                <Plus size={16} />
              </button>
            </div>
            <Button
              className="add-detail"
              disabled={
                !selectedSku ||
                selectedSku.stock < 1 ||
                (variants.length > 0 && !variants.every((variant) => selected[variant.name]))
              }
              onClick={() => selectedSku && void addToCart(selectedSku, product, quantity)}
            >
              <ShoppingBag size={17} /> Thêm vào giỏ
            </Button>
          </div>
          <div className="detail-policies">
            <span>
              <Truck size={17} />
              <span>
                <strong>Giao hàng nhanh</strong>
                <small>Toàn quốc từ 2–5 ngày</small>
              </span>
            </span>
            <span>
              <ShieldCheck size={17} />
              <span>
                <strong>An tâm mua sắm</strong>
                <small>Đổi trả trong 7 ngày</small>
              </span>
            </span>
          </div>
        </div>
      </div>
      {product.highlights?.length || (product.specifications && Object.keys(product.specifications).length) ? (
        <section className="product-information">
          {product.highlights?.length ? (
            <div className="product-highlights">
              <span className="eyebrow">HIGHLIGHTS</span>
              <h2>Điểm nổi bật</h2>
              <div className="highlight-grid">
                {product.highlights.map((highlight) => (
                  <div key={highlight}>
                    <span className="highlight-dot" />
                    <p>{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {product.specifications && Object.keys(product.specifications).length ? (
            <div className="product-specifications">
              <span className="eyebrow">SPECIFICATIONS</span>
              <h2>Thông số sản phẩm</h2>
              <dl>
                {Object.entries(product.specifications).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="reviews-section" id="reviews">
        <div className="section-head">
          <div>
            <span className="eyebrow">CUSTOMER NOTES</span>
            <h2>Người mua nói gì?</h2>
          </div>
          <div className="review-summary">
            <strong>{(reviews.data?.rating.average || 0).toFixed(1)}</strong>
            <Stars value={reviews.data?.rating.average || 0} count={reviews.data?.rating.count || 0} />
          </div>
        </div>
        {reviews.isLoading ? (
          <div className="review-list">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        ) : reviews.data?.data.length ? (
          <div className="review-list">
            {reviews.data.data.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có đánh giá" text="Hãy là người đầu tiên chia sẻ trải nghiệm." />
        )}
      </section>
    </section>
  )
}
export function CartPage() {
  const { user, cart, guestCart, updateCart, removeFromCart } = useCommerce()
  const navigate = useNavigate()
  const items = user ? cart?.items || [] : guestCart
  const total = user
    ? Number(cart?.summary.totalPrice || 0)
    : guestCart.reduce((sum, item) => sum + Number(item.sku.price) * item.quantity, 0)
  return (
    <section className="page-section cart-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={14} />
        <span>Giỏ hàng</span>
      </div>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">YOUR SELECTION</span>
          <h1>Giỏ hàng</h1>
          <p>{items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</p>
        </div>
      </div>
      {items.length ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {items.map((item) => (
              <CartLine key={item.skuId} item={item} onUpdate={updateCart} onRemove={removeFromCart} />
            ))}
          </div>
          <OrderSummary
            subtotal={total}
            action={
              <Button
                className="full-button"
                onClick={() => navigate(user ? '/checkout' : `/login?redirect=${encodeURIComponent('/checkout')}`)}
              >
                Tiến hành thanh toán <ArrowRight size={17} />
              </Button>
            }
          />
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingBag size={34} />}
          title="Giỏ hàng đang trống"
          text="Một vài món đồ tốt đang chờ bạn khám phá."
          action={
            <Link to="/products" className="button button-primary">
              Khám phá sản phẩm
            </Link>
          }
        />
      )}
    </section>
  )
}
