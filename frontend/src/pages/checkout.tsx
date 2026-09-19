import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight, ChevronRight, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api, ApiError } from '../api'
import { money } from '../lib'
import { useAuth, useCommerce } from '../app-context'
import { Button, EmptyState, ErrorState, Field } from '../components/ui'
import { OrderSummary } from '../components/commerce'
import type { Address, Order } from '../types'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user)
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <>{children}</>
}
export function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  )
}
function CheckoutContent() {
  const { cart, refreshCart } = useCommerce()
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/addresses') })
  const [addressId, setAddressId] = useState<number | ''>('')
  const [coupon, setCoupon] = useState('')
  const [addingAddress, setAddingAddress] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(() => {
    const stored = Number(localStorage.getItem('ecommerce-pending-order-id'))
    return Number.isSafeInteger(stored) && stored > 0 ? stored : null
  })
  const pendingOrder = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api<Order>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
    retry: false,
  })
  const orderMutation = useMutation({
    mutationFn: () => {
      if (!addressId) throw new Error('Vui lòng chọn địa chỉ giao hàng.')
      return api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ addressId: Number(addressId), ...(coupon.trim() ? { couponCode: coupon.trim() } : {}) }),
      })
    },
    onSuccess: (order) => {
      setOrderId(order.id)
      localStorage.setItem('ecommerce-pending-order-id', String(order.id))
      void refreshCart()
    },
  })
  const paymentMutation = useMutation({
    mutationFn: (id: number) =>
      api<{ checkoutUrl: string }>('/payments', { method: 'POST', body: JSON.stringify({ orderId: id }) }),
    onSuccess: (payment) => {
      if (payment.checkoutUrl) window.location.href = payment.checkoutUrl
    },
  })
  useEffect(() => {
    const preferred = addresses.data?.find((address) => address.isDefault) || addresses.data?.[0]
    // The selected address follows the server's default address after a query refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preferred) setAddressId(preferred.id)
  }, [addresses.data])
  useEffect(() => {
    if (!orderId) return
    if (pendingOrder.isError || (pendingOrder.data && pendingOrder.data.status !== 'PENDING_PAYMENT')) {
      localStorage.removeItem('ecommerce-pending-order-id')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderId(null)
    }
  }, [orderId, pendingOrder.data, pendingOrder.isError])
  if (!cart?.items.length && !orderId)
    return (
      <EmptyState
        title="Giỏ hàng đang trống"
        text="Thêm sản phẩm trước khi thanh toán."
        action={
          <Link to="/products" className="button button-primary">
            Quay lại mua sắm
          </Link>
        }
      />
    )
  const order = orderId ? pendingOrder.data : null
  const cartTotal = Number(cart?.summary.totalPrice || 0)
  const summarySubtotal = order ? Number(order.subtotal || 0) : cartTotal
  const summaryDiscount = order ? Number(order.discount || 0) : 0
  const summaryTotal = order ? Number(order.total || 0) : cartTotal
  return (
    <section className="page-section checkout-page">
      <div className="breadcrumbs mb-8">
        <Link to="/cart">Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span>Thanh toán</span>
      </div>
      <div className="checkout-layout grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="checkout-main space-y-6">
          <div className="checkout-heading">
            <span className="eyebrow text-blue-600 font-bold tracking-wider">CHECKOUT</span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Hoàn tất đơn hàng</h1>
            <p className="text-slate-500 text-sm mt-1">Chỉ còn vài bước nữa để món đồ thuộc về bạn.</p>
          </div>

          <section className="checkout-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="checkout-card-title flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="step-number w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                  01
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Địa chỉ giao hàng</h2>
                  <p className="text-xs text-slate-500">Chọn nơi chúng mình gửi đơn tới.</p>
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1 rounded-md"
                onClick={() => setAddingAddress((value) => !value)}
              >
                {addingAddress ? 'Đóng' : '+ Thêm địa chỉ mới'}
              </button>
            </div>

            {addingAddress ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-3">
                <AddressForm
                  onCreated={() => {
                    setAddingAddress(false)
                    void addresses.refetch()
                  }}
                />
              </div>
            ) : null}

            {addresses.isError ? (
              <ErrorState onRetry={() => void addresses.refetch()} />
            ) : addresses.data?.length ? (
              <div className="address-list space-y-3">
                {addresses.data.map((address) => {
                  const isSelected = addressId === address.id
                  return (
                    <label
                      className={`address-option flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                      key={address.id}
                    >
                      <input
                        type="radio"
                        name="address"
                        className="mt-1 text-blue-600 focus:ring-blue-500 accent-blue-600"
                        checked={isSelected}
                        onChange={() => setAddressId(address.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-900">{address.name}</strong>
                          <span className="text-xs text-slate-500">({address.phoneNumber})</span>
                          {address.isDefault ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                              Mặc định
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{address.address}</p>
                        {address.note ? (
                          <p className="text-[11px] text-slate-400 mt-0.5 italic">Ghi chú: {address.note}</p>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="Chưa có địa chỉ" text="Thêm một địa chỉ để tiếp tục đặt hàng." />
            )}
          </section>

          <section className="checkout-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="checkout-card-title flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="step-number w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                02
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Mã ưu đãi & Giảm giá</h2>
                <p className="text-xs text-slate-500">Nhập mã voucher hoặc khuyến mãi nếu có.</p>
              </div>
            </div>
            <div className="coupon-row flex gap-3 max-w-md">
              <input
                value={coupon}
                onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                placeholder="Nhập mã (VD: ELANVIP)"
                disabled={Boolean(orderId)}
                className="flex-1 uppercase font-semibold tracking-wider text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 transition-colors"
              />
            </div>
            {order ? (
              summaryDiscount > 0 ? (
                <div className="inline-alert success p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <span>✓</span> Đã áp dụng mã giảm giá thành công! Tiết kiệm {money(summaryDiscount)}.
                </div>
              ) : coupon.trim() ? (
                <div className="inline-alert p-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                  Mã "{coupon.trim()}" không áp dụng được cho đơn này.
                </div>
              ) : null
            ) : (
              <p className="coupon-hint text-xs text-slate-400">
                Mã sẽ được kiểm tra và tính vào tổng tiền khi bạn xác nhận tạo đơn.
              </p>
            )}
          </section>

          <section className="checkout-card payment-note rounded-2xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <LockKeyhole size={20} />
            </div>
            <div>
              <strong className="text-sm font-bold text-slate-900 block">Thanh toán an toàn qua cổng PayOS</strong>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Sau khi xác nhận đơn hàng, bạn sẽ được chuyển hướng tới cổng thanh toán bảo mật với chuẩn mã hóa SSL
                256-bit.
              </p>
            </div>
          </section>

          {orderMutation.isError ? (
            <div className="inline-alert error p-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              {orderMutation.error instanceof ApiError
                ? orderMutation.error.message
                : 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.'}
            </div>
          ) : null}

          {orderId ? (
            <div className="inline-alert success p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
              <span>✓</span> Đơn #{orderId} đang chờ thanh toán. Bạn có thể bấm "Thanh toán ngay" để hoàn tất.
            </div>
          ) : null}
        </div>

        <aside className="checkout-side sticky top-24">
          <OrderSummary
            subtotal={summarySubtotal}
            discount={summaryDiscount}
            total={summaryTotal}
            action={
              orderId ? (
                <Button
                  className="full-button min-h-[48px] text-base font-bold shadow-md hover:shadow-lg"
                  loading={paymentMutation.isPending}
                  onClick={() => void paymentMutation.mutateAsync(orderId)}
                >
                  Thanh toán ngay <ArrowRight size={17} />
                </Button>
              ) : (
                <Button
                  className="full-button min-h-[48px] text-base font-bold shadow-md hover:shadow-lg"
                  loading={orderMutation.isPending}
                  disabled={!addressId || !cart?.items.length}
                  onClick={() => void orderMutation.mutateAsync()}
                >
                  Xác nhận đơn hàng <ArrowRight size={17} />
                </Button>
              )
            }
          />
        </aside>
      </div>
    </section>
  )
}
const addressSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên người nhận.').max(100),
  phoneNumber: z.string().trim().min(8, 'Số điện thoại chưa đúng.').max(20),
  address: z.string().trim().min(1, 'Nhập địa chỉ giao hàng.').max(500),
  note: z.string().trim().max(500).optional(),
})
type AddressFormValues = z.infer<typeof addressSchema>

export function AddressForm({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState('')
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { name: '', phoneNumber: '', address: '', note: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: AddressFormValues) =>
      api<Address>('/addresses', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: onCreated,
  })
  return (
    <form
      className="address-form"
      onSubmit={form.handleSubmit((values) => {
        setError('')
        void mutation
          .mutateAsync(values)
          .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không thể thêm địa chỉ.'))
      })}
    >
      <div className="form-grid">
        <Field label="Tên người nhận" error={form.formState.errors.name?.message}>
          <input {...form.register('name')} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Số điện thoại" error={form.formState.errors.phoneNumber?.message}>
          <input {...form.register('phoneNumber')} inputMode="tel" placeholder="0912 345 678" />
        </Field>
      </div>
      <Field label="Địa chỉ" error={form.formState.errors.address?.message}>
        <input {...form.register('address')} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
      </Field>
      <Field label="Ghi chú (không bắt buộc)" error={form.formState.errors.note?.message}>
        <input {...form.register('note')} placeholder="Giao giờ hành chính..." />
      </Field>
      {error ? <div className="inline-alert error">{error}</div> : null}
      <Button type="submit" loading={mutation.isPending}>
        Lưu địa chỉ
      </Button>
    </form>
  )
}
