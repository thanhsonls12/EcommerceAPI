import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { money } from '../../lib'
import { Button, EmptyState, ErrorState, Field, PageLoader } from '../../components/ui'
import { AdminCard, AdminHeader, Modal } from './admin-ui'
import { errorMessage } from './admin-lib'
import type { Brand, Category, Product, ProductListResponse, ProductMedia, Sku } from '../../types'

type ProductForm = {
  name: string
  basePrice: string
  virtualPrice: string
  brandId: string
  categoryIds: number[]
}

const emptyForm: ProductForm = { name: '', basePrice: '', virtualPrice: '', brandId: '', categoryIds: [] }

export function AdminProducts() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [managingSku, setManagingSku] = useState<Product | null>(null)
  const [error, setError] = useState('')

  const products = useQuery({
    queryKey: ['admin', 'products', page],
    queryFn: () => api<ProductListResponse>(`/products?page=${page}&limit=12&sortBy=createdAt&sortOrder=desc`),
  })
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api<Brand[]>('/brands') })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories') })

  const remove = useMutation({
    mutationFn: (id: number) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
    onError: (reason) => setError(errorMessage(reason, 'Không thể xóa sản phẩm.')),
  })

  const closeForm = () => {
    setEditing(null)
    setCreating(false)
  }

  if (products.isLoading || brands.isLoading || categories.isLoading) return <PageLoader />
  if (products.isError) return <ErrorState onRetry={() => void products.refetch()} />

  const list = products.data?.data || []
  const pagination = products.data?.pagination

  return (
    <>
      <AdminHeader
        title="Sản phẩm"
        subtitle="Tạo, chỉnh sửa sản phẩm và quản lý SKU."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Thêm sản phẩm
          </Button>
        }
      />
      {error ? <div className="inline-alert error">{error}</div> : null}
      <AdminCard>
        {list.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Thương hiệu</th>
                <th>Giá</th>
                <th className="ta-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-cell">
                      <img
                        src={product.images?.[0] || 'https://placehold.co/80x80/f4f1eb/1d2433?text=E'}
                        alt={product.name}
                      />
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td>{product.brand?.name || '—'}</td>
                  <td>{money(product.basePrice)}</td>
                  <td className="ta-right">
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" title="Quản lý SKU" onClick={() => setManagingSku(product)}>
                        <Boxes size={16} />
                      </button>
                      <button className="admin-icon-btn" title="Sửa" onClick={() => setEditing(product)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-icon-btn danger"
                        title="Xóa"
                        onClick={() => {
                          if (confirm(`Xóa sản phẩm "${product.name}"?`)) remove.mutate(product.id)
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Chưa có sản phẩm" text="Bắt đầu bằng cách thêm sản phẩm đầu tiên." />
        )}
        {pagination && pagination.totalPages > 1 ? (
          <div className="admin-pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Trước
            </Button>
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </AdminCard>
      {creating || editing ? (
        <ProductFormModal
          product={editing}
          brands={brands.data || []}
          categories={categories.data || []}
          onClose={closeForm}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
            closeForm()
          }}
        />
      ) : null}
      {managingSku ? <SkuManagerModal product={managingSku} onClose={() => setManagingSku(null)} /> : null}
    </>
  )
}

function ProductFormModal({
  product,
  brands,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null
  brands: Brand[]
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          name: product.name,
          basePrice: String(product.basePrice ?? ''),
          virtualPrice: String(product.virtualPrice ?? ''),
          brandId: String(product.brand?.id ?? ''),
          categoryIds: (product.categories || []).map((category) => category.id),
        }
      : emptyForm,
  )

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        basePrice: Number(form.basePrice),
        virtualPrice: Number(form.virtualPrice),
        brandId: Number(form.brandId),
        categoryIds: form.categoryIds,
      }
      if (product)
        return api(`/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      return api('/products', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: onSaved,
    onError: (reason) => setError(errorMessage(reason, 'Không thể lưu sản phẩm.')),
  })

  const toggleCategory = (id: number) =>
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(id)
        ? current.categoryIds.filter((value) => value !== id)
        : [...current.categoryIds, id],
    }))

  return (
    <Modal title={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void mutation.mutateAsync()
        }}
      >
        <Field label="Tên sản phẩm">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        <div className="form-grid">
          <Field label="Giá bán (VND)">
            <input
              type="number"
              min="1"
              value={form.basePrice}
              onChange={(event) => setForm({ ...form, basePrice: event.target.value })}
              required
            />
          </Field>
          <Field label="Giá niêm yết (VND)">
            <input
              type="number"
              min="1"
              value={form.virtualPrice}
              onChange={(event) => setForm({ ...form, virtualPrice: event.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Thương hiệu">
          <select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })} required>
            <option value="">-- Chọn thương hiệu --</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="field">
          <span>Danh mục</span>
          <div className="admin-chip-group">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`admin-chip ${form.categoryIds.includes(category.id) ? 'on' : ''}`}
                onClick={() => toggleCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        {product ? (
          <ProductImages product={product} />
        ) : (
          <p className="admin-muted">Lưu sản phẩm trước, sau đó mở lại để thêm ảnh và SKU.</p>
        )}
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!form.categoryIds.length}>
            {product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ProductImages({ product }: { product: Product }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [medias, setMedias] = useState<ProductMedia[]>(product.medias || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const syncList = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })

  const upload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const updated = await api<Product>(`/products/${product.id}/images`, { method: 'POST', body: formData })
      setMedias(updated.medias || [])
      syncList()
    } catch (reason) {
      setError(errorMessage(reason, 'Không tải được ảnh.'))
    } finally {
      setUploading(false)
    }
  }

  const remove = async (media: ProductMedia) => {
    if (!media.id || !confirm('Xóa ảnh này?')) return
    setError('')
    try {
      await api(`/products/${product.id}/images/${media.id}`, { method: 'DELETE' })
      setMedias((current) => current.filter((item) => item.id !== media.id))
      syncList()
    } catch (reason) {
      setError(errorMessage(reason, 'Không xóa được ảnh.'))
    }
  }

  return (
    <div className="field">
      <span>Ảnh sản phẩm</span>
      <div className="admin-image-grid">
        {medias.map((media) => (
          <div className="admin-image-item" key={media.id ?? media.url}>
            <img src={media.url} alt="" />
            <button type="button" className="admin-image-del" title="Xóa ảnh" onClick={() => void remove(media)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="admin-image-add"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={18} />
          <small>{uploading ? 'Đang tải...' : 'Thêm ảnh'}</small>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />
      {error ? <div className="inline-alert error">{error}</div> : null}
    </div>
  )
}

type SkuForm = { value: string; price: string; stock: string; image: string }
const emptySku: SkuForm = { value: '', price: '', stock: '', image: '' }

function SkuManagerModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<SkuForm>(emptySku)
  const [uploading, setUploading] = useState(false)

  const skus = useQuery({
    queryKey: ['admin', 'skus', product.id],
    queryFn: () => api<Sku[]>(`/products/${product.id}/skus`),
  })

  const create = useMutation({
    mutationFn: () => {
      let parsedValue: Record<string, string>
      try {
        parsedValue = JSON.parse(form.value) as Record<string, string>
      } catch {
        throw new Error('Giá trị SKU phải là JSON hợp lệ, ví dụ {"Màu":"Đen"}.')
      }
      return api(`/products/${product.id}/skus`, {
        method: 'POST',
        body: JSON.stringify({
          value: parsedValue,
          price: Number(form.price),
          stock: Number(form.stock),
          image: form.image.trim(),
        }),
      })
    },
    onSuccess: () => {
      setForm(emptySku)
      void skus.refetch()
    },
    onError: (reason) => setError(errorMessage(reason, 'Không thể tạo SKU.')),
  })

  const removeSku = useMutation({
    mutationFn: (skuId: number) => api(`/products/${product.id}/skus/${skuId}`, { method: 'DELETE' }),
    onSuccess: () => void skus.refetch(),
    onError: (reason) => setError(errorMessage(reason, 'Không thể xóa SKU.')),
  })

  const uploadImage = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const updated = await api<Product>(`/products/${product.id}/images`, { method: 'POST', body: formData })
      const uploadedUrl = updated.images?.[updated.images.length - 1]
      if (uploadedUrl) setForm((current) => ({ ...current, image: uploadedUrl }))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    } catch (reason) {
      setError(errorMessage(reason, 'Không tải được ảnh.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title={`SKU · ${product.name}`} onClose={onClose}>
      {skus.isLoading ? (
        <PageLoader />
      ) : (
        <div className="admin-sku-list">
          {skus.data?.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Giá trị</th>
                  <th>Giá</th>
                  <th className="ta-right">Tồn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {skus.data.map((sku) => (
                  <tr key={sku.id}>
                    <td>{sku.value ? Object.values(sku.value).join(' · ') : '—'}</td>
                    <td>{money(sku.price)}</td>
                    <td className="ta-right">{sku.stock}</td>
                    <td className="ta-right">
                      <button
                        className="admin-icon-btn danger"
                        title="Xóa SKU"
                        onClick={() => {
                          if (confirm('Xóa SKU này?')) removeSku.mutate(sku.id)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted">Sản phẩm chưa có SKU nào.</p>
          )}
        </div>
      )}
      <form
        className="admin-form admin-sku-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void create.mutateAsync()
        }}
      >
        <h3>Thêm SKU mới</h3>
        <Field label='Giá trị (JSON, ví dụ {"Màu":"Đen","Dung lượng":"256GB"})'>
          <input
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            placeholder='{"Màu":"Đen"}'
            required
          />
        </Field>
        <div className="form-grid">
          <Field label="Giá (VND)">
            <input
              type="number"
              min="1"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </Field>
          <Field label="Tồn kho">
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="URL ảnh SKU">
          <input
            value={form.image}
            onChange={(event) => setForm({ ...form, image: event.target.value })}
            placeholder="https://..."
            required
          />
        </Field>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void uploadImage(file)
            event.target.value = ''
          }}
        />
        <Button variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={16} /> Tải ảnh lên sản phẩm
        </Button>
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button type="submit" loading={create.isPending}>
            Thêm SKU
          </Button>
        </div>
      </form>
    </Modal>
  )
}
