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
      <div className="breadcrumbs">
        <Link to="/cart">Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span>Thanh toán</span>
      </div>
      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-heading">
            <span className="eyebrow">CHECKOUT</span>
            <h1>Hoàn tất đơn hàng</h1>
            <p>Chỉ còn vài bước nữa để món đồ thuộc về bạn.</p>
          </div>
          <section className="checkout-card">
            <div className="checkout-card-title">
              <span className="step-number">01</span>
              <div>
                <h2>Địa chỉ giao hàng</h2>
                <p>Chọn nơi chúng mình gửi đơn tới.</p>
              </div>
              <button className="text-link" onClick={() => setAddingAddress((value) => !value)}>
                {addingAddress ? 'Đóng' : '+ Thêm địa chỉ'}
              </button>
            </div>
            {addingAddress ? (
              <AddressForm
                onCreated={() => {
                  setAddingAddress(false)
                  void addresses.refetch()
                }}
              />
            ) : null}
            {addresses.isError ? (
              <ErrorState onRetry={() => void addresses.refetch()} />
            ) : addresses.data?.length ? (
              <div className="address-list">
                {addresses.data.map((address) => (
                  <label className={`address-option ${addressId === address.id ? 'selected' : ''}`} key={address.id}>
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                    />
                    <span>
                      <strong>{address.name}</strong>
                      <small>
                        {address.phoneNumber} · {address.address}
                      </small>
                    </span>
                    {address.isDefault ? <em>Mặc định</em> : null}
                  </label>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có địa chỉ" text="Thêm một địa chỉ để tiếp tục." />
            )}
          </section>
          <section className="checkout-card">
            <div className="checkout-card-title">
              <span className="step-number">02</span>
              <div>
                <h2>Ưu đãi</h2>
                <p>Mã giảm giá (nếu có).</p>
              </div>
            </div>
            <div className="coupon-row">
              <input
                value={coupon}
                onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                placeholder="Nhập mã giảm giá"
                disabled={Boolean(orderId)}
              />
            </div>
            {order ? (
              summaryDiscount > 0 ? (
                <div className="inline-alert success">
                  Đã áp dụng mã giảm giá, tiết kiệm {money(summaryDiscount)}.
                </div>
              ) : coupon.trim() ? (
                <div className="inline-alert">Mã "{coupon.trim()}" không mang lại giảm giá cho đơn này.</div>
              ) : null
            ) : (
              <p className="coupon-hint">Mã sẽ được kiểm tra và áp dụng khi bạn xác nhận đơn hàng.</p>
            )}
          </section>
          <section className="checkout-card payment-note">
            <LockKeyhole size={20} />
            <div>
              <strong>Thanh toán an toàn qua PayOS</strong>
              <p>Bạn sẽ được chuyển tới cổng thanh toán bảo mật sau khi xác nhận đơn.</p>
            </div>
          </section>
          {orderMutation.isError ? (
            <div className="inline-alert error">
              {orderMutation.error instanceof ApiError
                ? orderMutation.error.message
                : 'Không thể tạo đơn. Vui lòng kiểm tra lại.'}
            </div>
          ) : null}
          {orderId ? (
            <div className="inline-alert success">
              Đơn #{orderId} đang chờ thanh toán. Bạn có thể tiếp tục thanh toán kể cả sau khi tải lại trang.
            </div>
          ) : null}
        </div>
        <aside className="checkout-side">
          <OrderSummary
            subtotal={summarySubtotal}
            discount={summaryDiscount}
            total={summaryTotal}
            action={
              orderId ? (
                <Button
                  className="full-button"
                  loading={paymentMutation.isPending}
                  onClick={() => void paymentMutation.mutateAsync(orderId)}
                >
                  Thanh toán ngay <ArrowRight size={17} />
                </Button>
              ) : (
                <Button
                  className="full-button"
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
