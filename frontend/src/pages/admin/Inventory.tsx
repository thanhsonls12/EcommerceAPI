import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, PackagePlus, SlidersHorizontal } from 'lucide-react'
import { api } from '../../api'
import { date, money } from '../../lib'
import { Button, EmptyState, ErrorState, Field, PageLoader } from '../../components/ui'
import { AdminCard, AdminHeader, Modal } from './admin-ui'
import { errorMessage } from './admin-lib'
import type { InventoryHistoryResponse, LowStockSku } from '../../types'

export function AdminInventory() {
  const queryClient = useQueryClient()
  const [threshold, setThreshold] = useState(10)
  const [adjustSku, setAdjustSku] = useState<LowStockSku | null>(null)
  const [historySku, setHistorySku] = useState<LowStockSku | null>(null)

  const lowStock = useQuery({
    queryKey: ['admin', 'low-stock', threshold],
    queryFn: () => api<LowStockSku[]>(`/inventory/low-stock?threshold=${threshold}`),
  })

  if (lowStock.isLoading) return <PageLoader />
  if (lowStock.isError) return <ErrorState onRetry={() => void lowStock.refetch()} />

  return (
    <>
      <AdminHeader
        title="Tồn kho"
        subtitle="Theo dõi SKU sắp hết và điều chỉnh số lượng."
        action={
          <div className="admin-threshold">
            <label>Ngưỡng</label>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(event) => setThreshold(Math.max(0, Number(event.target.value)))}
            />
          </div>
        }
      />
      <AdminCard>
        {lowStock.data?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>Giá</th>
                <th className="ta-right">Tồn</th>
                <th className="ta-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.data.map((sku) => (
                <tr key={sku.id}>
                  <td>{sku.product?.name || `#${sku.id}`}</td>
                  <td>{sku.value ? Object.values(sku.value).join(' · ') : '—'}</td>
                  <td>{money(sku.price)}</td>
                  <td className="ta-right">
                    <span className={`admin-stock ${sku.stock === 0 ? 'zero' : 'low'}`}>{sku.stock}</span>
                  </td>
                  <td className="ta-right">
                    <div className="admin-row-actions">
                      <button className="admin-icon-btn" title="Lịch sử" onClick={() => setHistorySku(sku)}>
                        <History size={16} />
                      </button>
                      <button className="admin-icon-btn" title="Điều chỉnh" onClick={() => setAdjustSku(sku)}>
                        <SlidersHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<PackagePlus size={28} />}
            title="Không có SKU dưới ngưỡng"
            text="Tất cả SKU đều còn hàng trên mức ngưỡng đã chọn."
          />
        )}
      </AdminCard>
      {adjustSku ? (
        <AdjustModal
          sku={adjustSku}
          onClose={() => setAdjustSku(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'low-stock'] })
            setAdjustSku(null)
          }}
        />
      ) : null}
      {historySku ? <HistoryModal sku={historySku} onClose={() => setHistorySku(null)} /> : null}
    </>
  )
}

function AdjustModal({ sku, onClose, onSaved }: { sku: LowStockSku; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('')
  const [type, setType] = useState<'RESTOCK' | 'ADJUSTMENT'>('RESTOCK')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          skuId: sku.id,
          type,
          quantity: Number(quantity),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      }),
    onSuccess: onSaved,
    onError: (reason) => setError(errorMessage(reason, 'Không thể điều chỉnh tồn kho.')),
  })

  return (
    <Modal title={`Điều chỉnh · ${sku.product?.name || `SKU #${sku.id}`}`} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void mutation.mutateAsync()
        }}
      >
        <p className="admin-muted">
          Tồn hiện tại: <strong>{sku.stock}</strong>
          {sku.value ? ` · ${Object.values(sku.value).join(' · ')}` : ''}
        </p>
        <Field label="Loại">
          <select value={type} onChange={(event) => setType(event.target.value as 'RESTOCK' | 'ADJUSTMENT')}>
            <option value="RESTOCK">Nhập thêm (RESTOCK)</option>
            <option value="ADJUSTMENT">Điều chỉnh (ADJUSTMENT)</option>
          </select>
        </Field>
        <Field
          label={type === 'RESTOCK' ? 'Số lượng nhập thêm (> 0)' : 'Số lượng thay đổi (âm để giảm, không được 0)'}
        >
          <input
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </Field>
        <Field label="Ghi chú (không bắt buộc)">
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        {error ? <div className="inline-alert error">{error}</div> : null}
        <div className="admin-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Xác nhận
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ sku, onClose }: { sku: LowStockSku; onClose: () => void }) {
  const history = useQuery({
    queryKey: ['admin', 'inventory-history', sku.id],
    queryFn: () => api<InventoryHistoryResponse>(`/inventory/skus/${sku.id}/history?page=1&limit=20`),
  })

  return (
    <Modal title={`Lịch sử tồn kho · ${sku.product?.name || `SKU #${sku.id}`}`} onClose={onClose}>
      {history.isLoading ? (
        <PageLoader />
      ) : history.data?.data.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Loại</th>
              <th className="ta-right">SL</th>
              <th className="ta-right">Trước → Sau</th>
              <th>Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {history.data.data.map((transaction) => (
              <tr key={transaction.id}>
                <td>{date(transaction.createdAt)}</td>
                <td>{transaction.type}</td>
                <td className="ta-right">{transaction.quantity}</td>
                <td className="ta-right">
                  {transaction.stockBefore} → {transaction.stockAfter}
                </td>
                <td>{transaction.createdBy?.name || 'Hệ thống'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="admin-muted">Chưa có giao dịch tồn kho.</p>
      )}
    </Modal>
  )
}
