import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { Button, EmptyState, ErrorState, Field, PageLoader } from '../../components/ui'
import { AdminCard, AdminHeader, Modal } from './admin-ui'
import { errorMessage } from './admin-lib'
import type { Brand, Category } from '../../types'

export function AdminCategories() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories') })

  const remove = useMutation({
    mutationFn: (id: number) => api(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (reason) => setError(errorMessage(reason, 'Không thể xóa danh mục.')),
  })

  if (categories.isLoading) return <PageLoader />
  if (categories.isError) return <ErrorState onRetry={() => void categories.refetch()} />

  return (
    <>
      <AdminHeader
        title="Danh mục"
        subtitle="Phân loại sản phẩm theo nhóm."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Thêm danh mục
          </Button>
        }
      />
      {error ? <div className="inline-alert error">{error}</div> : null}
      <AdminCard>
        {categories.data?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Danh mục cha</th>
                <th className="ta-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    {category.parentCategoryId
                      ? categories.data?.find((item) => item.id === category.parentCategoryId)?.name || '—'
                      : '—'}
                  </td>
                  <td className="ta-right">
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" title="Sửa" onClick={() => setEditing(category)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-icon-btn danger"
                        title="Xóa"
                        onClick={() => {
                          if (confirm(`Xóa danh mục "${category.name}"?`)) remove.mutate(category.id)
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
          <EmptyState title="Chưa có danh mục" text="Thêm danh mục đầu tiên." />
        )}
      </AdminCard>
      {creating || editing ? (
        <CategoryFormModal
          category={editing}
          categories={categories.data || []}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['categories'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      ) : null}
    </>
  )
}

function CategoryFormModal({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category: Category | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [name, setName] = useState(category?.name || '')
  const [parentId, setParentId] = useState<string>(category?.parentCategoryId ? String(category.parentCategoryId) : '')

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        parentCategoryId: parentId ? Number(parentId) : null,
      }
      if (category) return api(`/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      return api('/categories', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: onSaved,
    onError: (reason) => setError(errorMessage(reason, 'Không thể lưu danh mục.')),
  })

  return (
    <Modal title={category ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void mutation.mutateAsync()
        }}
      >
        <Field label="Tên danh mục">
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Danh mục cha (không bắt buộc)">
          <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">-- Không có --</option>
            {categories
              .filter((item) => item.id !== category?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </Field>
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {category ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function AdminBrands() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Brand | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api<Brand[]>('/brands') })

  const remove = useMutation({
    mutationFn: (id: number) => api(`/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['brands'] }),
    onError: (reason) => setError(errorMessage(reason, 'Không thể xóa thương hiệu.')),
  })

  if (brands.isLoading) return <PageLoader />
  if (brands.isError) return <ErrorState onRetry={() => void brands.refetch()} />

  return (
    <>
      <AdminHeader
        title="Thương hiệu"
        subtitle="Quản lý các nhãn hàng."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Thêm thương hiệu
          </Button>
        }
      />
      {error ? <div className="inline-alert error">{error}</div> : null}
      <AdminCard>
        {brands.data?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Tên</th>
                <th className="ta-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {brands.data.map((brand) => (
                <tr key={brand.id}>
                  <td>
                    {brand.logo ? (
                      <img
                        className="admin-logo w-10 h-10 object-contain rounded-md border border-slate-200 bg-white p-1 shrink-0"
                        src={brand.logo}
                        alt={brand.name}
                      />
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>{brand.name}</td>
                  <td className="ta-right">
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" title="Sửa" onClick={() => setEditing(brand)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-icon-btn danger"
                        title="Xóa"
                        onClick={() => {
                          if (confirm(`Xóa thương hiệu "${brand.name}"?`)) remove.mutate(brand.id)
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
          <EmptyState title="Chưa có thương hiệu" text="Thêm thương hiệu đầu tiên." />
        )}
      </AdminCard>
      {creating || editing ? (
        <BrandFormModal
          brand={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['brands'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      ) : null}
    </>
  )
}

function BrandFormModal({
  brand,
  onClose,
  onSaved,
}: {
  brand: Brand | null
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [name, setName] = useState(brand?.name || '')
  const [logo, setLogo] = useState(brand?.logo || '')

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), logo: logo.trim() }
      if (brand) return api(`/brands/${brand.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      return api('/brands', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: onSaved,
    onError: (reason) => setError(errorMessage(reason, 'Không thể lưu thương hiệu.')),
  })

  return (
    <Modal title={brand ? 'Sửa thương hiệu' : 'Thêm thương hiệu'} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void mutation.mutateAsync()
        }}
      >
        <Field label="Tên thương hiệu">
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="URL logo">
          <input value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://..." required />
        </Field>
        {logo ? (
          <img
            className="admin-logo-preview max-h-20 max-w-xs object-contain rounded-md border border-slate-200 bg-white p-2 mx-auto my-2"
            src={logo}
            alt="preview"
          />
        ) : null}
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {brand ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
