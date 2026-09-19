import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { date, money } from '../../lib'
import { Button, EmptyState, ErrorState, Field, PageLoader } from '../../components/ui'
import { AdminCard, AdminHeader, Modal, StatusPill } from './admin-ui'
import { errorMessage } from './admin-lib'
import type { Promotion } from '../../types'

type PromotionForm = {
  code: string
  name: string
  type: 'FIXED' | 'PERCENT'
  value: string
  minOrderValue: string
  maxDiscount: string
  usageLimit: string
  startsAt: string
  expiresAt: string
  isActive: boolean
}

function toDateInput(value?: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 16)
}

export function AdminPromotions() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const promotions = useQuery({ queryKey: ['admin', 'promotions'], queryFn: () => api<Promotion[]>('/promotions') })

  const remove = useMutation({
    mutationFn: (id: number) => api(`/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
    onError: (reason) => setError(errorMessage(reason, 'Không thể xóa khuyến mãi.')),
  })

  if (promotions.isLoading) return <PageLoader />
  if (promotions.isError) return <ErrorState onRetry={() => void promotions.refetch()} />

  return (
    <>
      <AdminHeader
        title="Khuyến mãi"
        subtitle="Quản lý mã giảm giá."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Thêm mã
          </Button>
        }
      />
      {error ? <div className="inline-alert error">{error}</div> : null}
      <AdminCard>
        {promotions.data?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Dùng</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th className="ta-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {promotions.data.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    <strong>{promotion.code}</strong>
                    <br />
                    <small className="admin-muted">{promotion.name}</small>
                  </td>
                  <td>{promotion.type === 'PERCENT' ? 'Phần trăm' : 'Cố định'}</td>
                  <td>{promotion.type === 'PERCENT' ? `${promotion.value}%` : money(promotion.value)}</td>
                  <td>
                    {promotion.usedCount}
                    {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ''}
                  </td>
                  <td>
                    <small>
                      {date(promotion.startsAt)} → {date(promotion.expiresAt)}
                    </small>
                  </td>
                  <td>
                    <StatusPill active={promotion.isActive} />
                  </td>
                  <td className="ta-right">
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" title="Sửa" onClick={() => setEditing(promotion)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="admin-icon-btn danger"
                        title="Xóa"
                        onClick={() => {
                          if (confirm(`Xóa mã "${promotion.code}"?`)) remove.mutate(promotion.id)
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
          <EmptyState title="Chưa có khuyến mãi" text="Thêm mã giảm giá đầu tiên." />
        )}
      </AdminCard>
      {creating || editing ? (
        <PromotionFormModal
          promotion={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      ) : null}
    </>
  )
}

function PromotionFormModal({
  promotion,
  onClose,
  onSaved,
}: {
  promotion: Promotion | null
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [form, setForm] = useState<PromotionForm>(() => ({
    code: promotion?.code || '',
    name: promotion?.name || '',
    type: promotion?.type || 'PERCENT',
    value: promotion ? String(promotion.value) : '',
    minOrderValue: promotion?.minOrderValue != null ? String(promotion.minOrderValue) : '',
    maxDiscount: promotion?.maxDiscount != null ? String(promotion.maxDiscount) : '',
    usageLimit: promotion?.usageLimit != null ? String(promotion.usageLimit) : '',
    startsAt: toDateInput(promotion?.startsAt),
    expiresAt: toDateInput(promotion?.expiresAt),
    isActive: promotion?.isActive ?? true,
  }))

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        type: form.type,
        value: Number(form.value),
        ...(form.minOrderValue ? { minOrderValue: Number(form.minOrderValue) } : {}),
        ...(form.type === 'PERCENT' && form.maxDiscount ? { maxDiscount: Number(form.maxDiscount) } : {}),
        ...(form.usageLimit ? { usageLimit: Number(form.usageLimit) } : {}),
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      }
      if (promotion)
        return api(`/promotions/${promotion.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...base, isActive: form.isActive }),
        })
      return api('/promotions', { method: 'POST', body: JSON.stringify({ ...base, code: form.code.trim() }) })
    },
    onSuccess: onSaved,
    onError: (reason) => setError(errorMessage(reason, 'Không thể lưu khuyến mãi.')),
  })

  return (
    <Modal title={promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void mutation.mutateAsync()
        }}
      >
        <div className="form-grid">
          <Field label="Mã">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              disabled={Boolean(promotion)}
              required
            />
          </Field>
          <Field label="Tên chương trình">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Loại giảm">
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as 'FIXED' | 'PERCENT' })}
            >
              <option value="PERCENT">Phần trăm (%)</option>
              <option value="FIXED">Số tiền cố định (VND)</option>
            </select>
          </Field>
          <Field label={form.type === 'PERCENT' ? 'Giá trị (%)' : 'Giá trị (VND)'}>
            <input
              type="number"
              min="1"
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
              required
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Đơn tối thiểu (VND, không bắt buộc)">
            <input
              type="number"
              min="0"
              value={form.minOrderValue}
              onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })}
            />
          </Field>
          {form.type === 'PERCENT' ? (
            <Field label="Giảm tối đa (VND, không bắt buộc)">
              <input
                type="number"
                min="1"
                value={form.maxDiscount}
                onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
              />
            </Field>
          ) : null}
        </div>
        <Field label="Giới hạn lượt dùng (không bắt buộc)">
          <input
            type="number"
            min="1"
            value={form.usageLimit}
            onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Bắt đầu">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              required
            />
          </Field>
          <Field label="Kết thúc">
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              required
            />
          </Field>
        </div>
        {promotion ? (
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            <span>Đang kích hoạt</span>
          </label>
        ) : null}
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {promotion ? 'Lưu thay đổi' : 'Tạo mã'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
