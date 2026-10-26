import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { discountPercent, money, productImage } from '../lib'
import { useCommerce } from '../app-context'
import { Button, EmptyState, ErrorState, PageLoader, ProductSkeleton, Stars } from '../components/ui'
import { Badge } from '../components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { CartLine, OrderSummary, ProductCard, ReviewCard, VariantPicker } from '../components/commerce'
import type { Brand, Category, Product, ProductListResponse, ReviewResponse, Sku } from '../types'

const benefitItems = [
  {
    title: 'Chọn kỹ, dùng lâu',
    text: 'Thông tin rõ ràng, nguồn gốc minh bạch, không phức tạp hóa quyết định của bạn.',
  },
  { title: 'Giao hàng minh bạch', text: 'Theo dõi từng bước từ lúc xác nhận đơn tới khi tận tay bạn nhận.' },
  { title: 'Hỗ trợ tận tâm', text: 'Đổi trả trong 7 ngày nếu không hài lòng. Chúng mình luôn sẵn sàng đồng hành.' },
]

export function HomePage() {
  const products = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => api<ProductListResponse>('/products?page=1&limit=8&sortBy=createdAt&sortOrder=desc', false),
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories', false) })
  const heroProduct = products.data?.data?.[0]

  return (
    <>
      <section className="page-shell grid min-w-0 grid-cols-1 gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-16">
        <div className="min-w-0">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <span className="h-px w-10 bg-accent" />
            Bộ sưu tập 2026
          </div>
          <h1 className="mt-6 max-w-3xl text-balance text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Công nghệ tốt hơn cho những ngày đẹp hơn.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
            Chọn những thiết bị được tuyển kỹ, giá minh bạch, cam kết chính hãng và giao tới bạn thật trọn vẹn.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              to="/products"
              className="inline-flex h-12 items-center justify-center gap-2 border border-ink bg-ink px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-soft"
            >
              Khám phá sản phẩm <ArrowUpRight size={16} />
            </Link>
            <Link
              to="/#benefits"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink"
            >
              Vì sao chọn Ecommerce →
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            <span>01 / Tuyển chọn</span>
            <span>02 / Bảo hành</span>
            <span>03 / Giao nhanh</span>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="border border-line bg-surface p-3">
            <div className="relative aspect-square min-w-0 overflow-hidden bg-paper-deep">
              {heroProduct ? (
                <img
                  src={productImage(heroProduct)}
                  alt={heroProduct.name}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full max-w-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-accent">
                  <ShoppingBag size={54} aria-hidden="true" />
                </div>
              )}
              <span className="absolute left-3 top-3 bg-accent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                Mới
              </span>
            </div>
            <div className="flex items-end justify-between gap-4 px-1 pt-3">
              <div className="min-w-0">
                <span className="label-mono">Sản phẩm mới</span>
                <p className="mt-1 truncate text-[13px] font-medium text-ink">{heroProduct?.name || 'Đang cập nhật'}</p>
              </div>
              {heroProduct ? (
                <span className="shrink-0 font-mono text-[13px] text-ink">{money(heroProduct.basePrice)}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            <span>01 — 04</span>
            <span>Curated tech</span>
          </div>
        </div>
      </section>

      <section className="page-shell border-t border-line py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="label-mono">Danh mục</span>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Khám phá theo nhóm</h2>
          </div>
          <Link to="/products" className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
            Tất cả →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {categories.data?.slice(0, 5).map((category, index) => (
            <Link
              key={category.id}
              to={`/products?categoryId=${category.id}`}
              className={`group flex min-h-32 flex-col justify-between bg-surface p-4 transition-colors hover:bg-paper ${
                index === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className="font-mono text-[10px] text-muted">0{index + 1}</span>
              <span className="mt-8 flex items-center justify-between gap-2 text-[13px] font-medium text-ink transition-colors group-hover:text-accent">
                {category.name}
                <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
          {categories.isLoading
            ? [1, 2, 3, 4, 5].map((item) => <div key={item} className="min-h-32 animate-pulse bg-paper-deep" />)
            : null}
        </div>
      </section>

      <section className="page-shell py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="label-mono">Mới về</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Sản phẩm nổi bật</h2>
          </div>
          <Link
            to="/products?sortBy=createdAt"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink"
          >
            Xem tất cả →
          </Link>
        </div>
        {products.isError ? (
          <div className="mt-8">
            <ErrorState onRetry={() => void products.refetch()} />
          </div>
        ) : products.isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <ProductSkeleton key={item} />
            ))}
          </div>
        ) : products.data?.data.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="Cửa hàng đang cập nhật sản phẩm"
              text="Sản phẩm mới sẽ sớm xuất hiện. Bạn có thể xem toàn bộ danh mục trong lúc chờ."
              action={
                <Link to="/products" className="button button-primary">
                  Xem danh mục
                </Link>
              }
            />
          </div>
        )}
      </section>

      <section id="benefits" className="scroll-mt-24 border-y border-line bg-surface">
        <div className="page-shell grid gap-8 py-12 md:grid-cols-3">
          {benefitItems.map((item, index) => (
            <div key={item.title} className="grid content-start gap-3">
              <span className="font-mono text-[10px] text-accent">0{index + 1}</span>
              <strong className="text-[14px] font-semibold text-ink">{item.title}</strong>
              <p className="text-[13px] leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState<URLSearchParams | null>(null)
  const [priceInputs, setPriceInputs] = useState({ min: '', max: '' })
  const paramsRef = useRef(params)
  const priceTimer = useRef<number | null>(null)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const positiveIntParam = (value: string | null) => {
    if (!value) return ''
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : ''
  }
  const nonNegativeNumberParam = (value: string | null) => {
    if (!value) return ''
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : ''
  }

  const search = params.get('search') || ''
  const categoryId = positiveIntParam(params.get('categoryId'))
  const brandId = positiveIntParam(params.get('brandId'))
  const minPrice = nonNegativeNumberParam(params.get('minPrice'))
  const maxPrice = nonNegativeNumberParam(params.get('maxPrice'))
  const sortBy = params.get('sortBy') === 'price' ? 'price' : 'createdAt'
  const sortOrder = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const parsedPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const draftCategoryId = filterOpen && draft ? positiveIntParam(draft.get('categoryId')) : categoryId
  const draftBrandId = filterOpen && draft ? positiveIntParam(draft.get('brandId')) : brandId

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
  const hasFilters = Boolean(search || categoryId || brandId || minPrice || maxPrice)
  const draftHasFilters = Boolean(
    search || draftCategoryId || draftBrandId || (draft?.get('minPrice') ?? '') || (draft?.get('maxPrice') ?? ''),
  )

  useEffect(() => {
    if (!filterOpen)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriceInputs({ min: minPrice, max: maxPrice })
  }, [filterOpen, maxPrice, minPrice])

  useEffect(
    () => () => {
      if (priceTimer.current) window.clearTimeout(priceTimer.current)
    },
    [],
  )

  const patchParams = (source: URLSearchParams, patch: Record<string, string>) => {
    const next = new URLSearchParams(source)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    next.delete('page')
    return next
  }

  const applyFilters = (patch: Record<string, string>, replace = true) => {
    setParams(patchParams(paramsRef.current, patch), { replace })
  }

  const updateFilter = (patch: Record<string, string>) => {
    if (filterOpen) {
      setDraft((current) => patchParams(current ?? paramsRef.current, patch))
      return
    }
    applyFilters(patch)
  }

  const handleFilterOpenChange = (open: boolean) => {
    if (open) {
      setDraft(new URLSearchParams(paramsRef.current))
      setPriceInputs({ min: minPrice, max: maxPrice })
    } else {
      setDraft(null)
    }
    setFilterOpen(open)
  }

  const applyDraft = () => {
    const current = paramsRef.current
    const next = new URLSearchParams(draft ?? current)
    const filterKeys = ['search', 'categoryId', 'brandId', 'minPrice', 'maxPrice']
    const changed = filterKeys.some((key) => (next.get(key) ?? '') !== (current.get(key) ?? ''))
    if (changed) next.delete('page')
    setParams(next, { replace: !changed })
    handleFilterOpenChange(false)
  }

  const clearFilters = () => {
    if (filterOpen) {
      setDraft(new URLSearchParams())
      setPriceInputs({ min: '', max: '' })
      return
    }
    setParams({}, { replace: true })
  }

  const handlePriceChange = (key: 'min' | 'max', value: string) => {
    const next = { ...priceInputs, [key]: value }
    setPriceInputs(next)
    if (filterOpen) {
      updateFilter({ minPrice: next.min, maxPrice: next.max })
      return
    }
    if (priceTimer.current) window.clearTimeout(priceTimer.current)
    priceTimer.current = window.setTimeout(() => applyFilters({ minPrice: next.min, maxPrice: next.max }), 350)
  }

  const priceLabel =
    minPrice && maxPrice
      ? `${money(Number(minPrice))} – ${money(Number(maxPrice))}`
      : minPrice
        ? `Từ ${money(Number(minPrice))}`
        : `Đến ${money(Number(maxPrice))}`

  const filterPanel = (
    <FilterPanel
      categories={categories.data || []}
      brands={brands.data || []}
      categoryId={draftCategoryId}
      brandId={draftBrandId}
      priceInputs={priceInputs}
      hasFilters={hasFilters}
      onFilter={updateFilter}
      onPriceChange={handlePriceChange}
      onClear={clearFilters}
    />
  )

  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <span>Sản phẩm</span>
      </div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">The collection</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {search ? `Kết quả cho “${search}”` : 'Tất cả sản phẩm'}
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {products.isError
              ? 'Không tải được danh sách sản phẩm'
              : products.isLoading
                ? 'Đang tải sản phẩm…'
                : `${products.data?.pagination.total || 0} sản phẩm được tuyển chọn`}
          </p>
        </div>
        <Sheet open={filterOpen} onOpenChange={handleFilterOpenChange}>
          <SheetTrigger asChild>
            <Button variant="secondary" className="lg:hidden">
              <SlidersHorizontal size={15} /> Bộ lọc
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Bộ lọc</SheetTitle>
              <SheetDescription>Chọn danh mục, thương hiệu và khoảng giá.</SheetDescription>
            </SheetHeader>
            {filterPanel}
            <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-line bg-surface pt-3">
              <Button variant="secondary" onClick={clearFilters} disabled={!draftHasFilters}>
                Xóa tất cả
              </Button>
              <Button onClick={applyDraft}>Xem kết quả</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {search ? <FilterChip label={`“${search}”`} onRemove={() => applyFilters({ search: '' })} /> : null}
              {selectedCategory ? (
                <FilterChip label={selectedCategory} onRemove={() => applyFilters({ categoryId: '' })} />
              ) : null}
              {selectedBrand ? (
                <FilterChip label={selectedBrand} onRemove={() => applyFilters({ brandId: '' })} />
              ) : null}
              {minPrice || maxPrice ? (
                <FilterChip
                  label={priceLabel}
                  onRemove={() => {
                    setPriceInputs({ min: '', max: '' })
                    applyFilters({ minPrice: '', maxPrice: '' })
                  }}
                />
              ) : null}
              {!hasFilters ? <span className="label-mono">Tất cả sản phẩm</span> : null}
            </div>
            <label className="flex items-center gap-2">
              <span className="label-mono">Sắp xếp</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(event) => {
                  const [nextSort, nextOrder] = event.target.value.split(':')
                  setParams(patchParams(params, { sortBy: nextSort, sortOrder: nextOrder }), { replace: true })
                }}
                className="h-9 border border-line-strong bg-surface px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink outline-none focus:border-ink"
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <ProductSkeleton key={item} />
              ))}
            </div>
          ) : products.data?.data.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {products.data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa tìm thấy sản phẩm"
              text="Thử xóa bớt bộ lọc hoặc tìm một từ khóa khác nhé."
              action={
                <Button variant="secondary" onClick={clearFilters}>
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

function FilterPanel({
  categories,
  brands,
  categoryId,
  brandId,
  priceInputs,
  hasFilters,
  onFilter,
  onPriceChange,
  onClear,
}: {
  categories: Category[]
  brands: Brand[]
  categoryId: string
  brandId: string
  priceInputs: { min: string; max: string }
  hasFilters: boolean
  onFilter: (patch: Record<string, string>) => void
  onPriceChange: (key: 'min' | 'max', value: string) => void
  onClear: () => void
}) {
  return (
    <div className="grid content-start gap-7">
      <FilterGroup title="Danh mục">
        <FilterOption active={!categoryId} onClick={() => onFilter({ categoryId: '' })}>
          Tất cả danh mục
        </FilterOption>
        {categories.map((category) => (
          <FilterOption
            key={category.id}
            active={String(category.id) === categoryId}
            onClick={() => onFilter({ categoryId: String(category.id) })}
          >
            {category.name}
          </FilterOption>
        ))}
      </FilterGroup>
      <FilterGroup title="Thương hiệu">
        <FilterOption active={!brandId} onClick={() => onFilter({ brandId: '' })}>
          Tất cả thương hiệu
        </FilterOption>
        {brands.map((brand) => (
          <FilterOption
            key={brand.id}
            active={String(brand.id) === brandId}
            onClick={() => onFilter({ brandId: String(brand.id) })}
          >
            {brand.name}
          </FilterOption>
        ))}
      </FilterGroup>
      <div className="grid gap-3">
        <strong className="label-mono">Khoảng giá</strong>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            value={priceInputs.min}
            onChange={(event) => onPriceChange('min', event.target.value)}
            placeholder="Từ"
            aria-label="Giá từ"
            className="h-10 w-full border border-line-strong bg-surface px-2.5 font-mono text-[11px] text-ink outline-none focus:border-ink"
          />
          <input
            type="number"
            min="0"
            value={priceInputs.max}
            onChange={(event) => onPriceChange('max', event.target.value)}
            placeholder="Đến"
            aria-label="Giá đến"
            className="h-10 w-full border border-line-strong bg-surface px-2.5 font-mono text-[11px] text-ink outline-none focus:border-ink"
          />
        </div>
      </div>
      {hasFilters ? (
        <button
          className="justify-self-start font-mono text-[10px] uppercase tracking-[0.12em] text-accent hover:text-ink"
          onClick={onClear}
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <strong className="label-mono">{title}</strong>
      <div className="grid">{children}</div>
    </div>
  )
}

function FilterOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={`flex min-h-10 items-center gap-2 text-left text-[12px] transition-colors ${
        active ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
      onClick={onClick}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
      {children}
    </button>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 border border-line bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
      {label}
      <button className="text-muted hover:text-ink" onClick={onRemove} aria-label={`Bỏ lọc ${label}`}>
        ×
      </button>
    </span>
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
    <div className="mt-12 flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      <button
        disabled={pagination.page <= 1}
        onClick={() => onChange(pagination.page - 1)}
        aria-label="Trang trước"
        className="grid h-10 w-10 place-items-center border border-line bg-surface text-ink transition-colors hover:border-ink disabled:opacity-35"
      >
        <ChevronLeft size={16} />
      </button>
      <span>
        Trang {pagination.page} / {pagination.totalPages}
      </span>
      <button
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onChange(pagination.page + 1)}
        aria-label="Trang sau"
        className="grid h-10 w-10 place-items-center border border-line bg-surface text-ink transition-colors hover:border-ink disabled:opacity-35"
      >
        <ChevronRight size={16} />
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
  const maxQuantity = selectedSku?.stock || 99
  const effectiveQuantity = Math.min(quantity, maxQuantity)
  if (productQuery.isLoading) return <PageLoader />
  if (productQuery.isError || !product) return <ErrorState onRetry={() => void productQuery.refetch()} />
  const percent = discountPercent(product)
  return (
    <section className="page-shell py-8 pb-28 sm:py-10 lg:pb-20">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <Link to="/products">Sản phẩm</Link>
        <ChevronRight size={12} />
        <span className="normal-case tracking-normal text-muted">{product.name}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="aspect-square overflow-hidden border border-line bg-paper-deep">
            <img
              src={images[imageIndex]}
              alt={product.name}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image}
                className={`h-16 w-16 shrink-0 overflow-hidden border bg-surface p-1 transition-colors ${
                  index === imageIndex ? 'border-ink' : 'border-line hover:border-line-strong'
                }`}
                onClick={() => setImageIndex(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={index === imageIndex}
              >
                <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-6">
          <div>
            <span className="label-mono">{product.brand?.name || 'Ecommerce collection'}</span>
            <h1 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Stars value={reviews.data?.rating.average || 0} count={reviews.data?.rating.count || 0} />
              <a href="#reviews" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                Xem đánh giá
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 border-y border-line py-4">
            <strong className="font-mono text-2xl font-medium text-ink">
              {money(selectedSku?.price ?? product.basePrice)}
            </strong>
            {percent > 0 ? (
              <>
                <del className="font-mono text-[12px] text-muted">{money(product.virtualPrice)}</del>
                <Badge variant="accent">Tiết kiệm {percent}%</Badge>
              </>
            ) : null}
          </div>

          <p className="text-[13px] leading-relaxed text-ink-soft">
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

          <div className="min-h-6">
            {selectedSku ? (
              selectedSku.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Còn {selectedSku.stock} sản phẩm
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Tạm hết hàng
                </span>
              )
            ) : variants.length ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Chọn đầy đủ phiên bản để xem tồn kho
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Đang kiểm tra tồn kho…
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex h-12 items-center border border-line-strong bg-surface">
              <button
                className="grid h-full w-11 place-items-center text-muted transition-colors hover:bg-paper hover:text-ink"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Giảm số lượng"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center font-mono text-[13px] text-ink" aria-live="polite">
                {effectiveQuantity}
              </span>
              <button
                className="grid h-full w-11 place-items-center text-muted transition-colors hover:bg-paper hover:text-ink"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                aria-label="Tăng số lượng"
              >
                <Plus size={15} />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={
                !selectedSku ||
                selectedSku.stock < 1 ||
                (variants.length > 0 && !variants.every((variant) => selected[variant.name]))
              }
              onClick={() => selectedSku && void addToCart(selectedSku, product, effectiveQuantity)}
            >
              <ShoppingBag size={17} /> Thêm vào giỏ hàng
            </Button>
          </div>

          <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Truck size={17} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <strong className="block text-[12px] font-semibold text-ink">Giao hàng nhanh</strong>
                <small className="text-[11px] text-muted">Toàn quốc từ 2–4 ngày</small>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <strong className="block text-[12px] font-semibold text-ink">An tâm đổi trả</strong>
                <small className="text-[11px] text-muted">Bảo hành 7 ngày miễn phí</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {product.highlights?.length || (product.specifications && Object.keys(product.specifications).length) ? (
        <section className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-2">
          {product.highlights?.length ? (
            <div>
              <span className="label-mono">Highlights</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Điểm nổi bật</h2>
              <div className="mt-5 grid gap-3">
                {product.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-3 border-b border-line pb-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <p className="text-[13px] leading-relaxed text-ink-soft">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {product.specifications && Object.keys(product.specifications).length ? (
            <div>
              <span className="label-mono">Specifications</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Thông số sản phẩm</h2>
              <dl className="mt-5 border-t border-line">
                {Object.entries(product.specifications).map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(110px,0.7fr)_1.3fr] gap-4 border-b border-line py-3"
                  >
                    <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</dt>
                    <dd className="text-[12px] font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}

      <section id="reviews" className="mt-16 border-t border-line pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="label-mono">Customer notes</span>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Người mua nói gì?</h2>
          </div>
          <div className="flex items-center gap-3">
            <strong className="font-mono text-2xl font-medium text-ink">
              {(reviews.data?.rating.average || 0).toFixed(1)}
            </strong>
            <Stars value={reviews.data?.rating.average || 0} count={reviews.data?.rating.count || 0} />
          </div>
        </div>
        <div className="mt-6 max-w-3xl">
          {reviews.isLoading ? (
            <div className="grid gap-4">
              <div className="h-20 animate-pulse bg-paper-deep" />
              <div className="h-20 animate-pulse bg-paper-deep" />
            </div>
          ) : reviews.data?.data.length ? (
            <div className="grid gap-5">
              {reviews.data.data.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có đánh giá" text="Hãy là người đầu tiên chia sẻ trải nghiệm." />
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="label-mono">Giá</span>
            <strong className="block truncate font-mono text-[14px] text-ink">
              {money(selectedSku?.price ?? product.basePrice)}
            </strong>
          </div>
          <Button
            disabled={
              !selectedSku ||
              selectedSku.stock < 1 ||
              (variants.length > 0 && !variants.every((variant) => selected[variant.name]))
            }
            onClick={() => selectedSku && void addToCart(selectedSku, product, effectiveQuantity)}
          >
            <ShoppingBag size={16} /> Thêm vào giỏ
          </Button>
        </div>
      </div>
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
    <section className="page-shell py-8 pb-24 sm:py-10">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <span>Giỏ hàng</span>
      </div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">Your selection</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Giỏ hàng</h1>
          <p className="mt-2 text-[13px] text-muted">{items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</p>
        </div>
      </div>
      {items.length ? (
        <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="border-t border-line">
            {items.map((item) => (
              <CartLine key={item.skuId} item={item} onUpdate={updateCart} onRemove={removeFromCart} />
            ))}
          </div>
          <OrderSummary
            subtotal={total}
            action={
              <Button
                className="w-full"
                onClick={() => navigate(user ? '/checkout' : `/login?redirect=${encodeURIComponent('/checkout')}`)}
              >
                Tiến hành thanh toán <ArrowUpRight size={16} />
              </Button>
            }
          />
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingBag size={22} />}
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
