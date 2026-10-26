import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowUpRight, ChevronRight, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { money } from '../lib'
import { useCommerce } from '../app-context'
import { Alert, Button, EmptyState, ErrorState, Field, Input } from '../components/ui'
import { RequireAuth } from '../components/RequireAuth'
import { OrderSummary } from '../components/commerce'
import type { Address, Order } from '../types'

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
      <div className="page-shell py-16">
        <EmptyState
          title="Giỏ hàng đang trống"
          text="Thêm sản phẩm trước khi thanh toán."
          action={
            <Link to="/products" className="button button-primary">
              Quay lại mua sắm
            </Link>
          }
        />
      </div>
    )
  const order = orderId ? pendingOrder.data : null
  const cartTotal = Number(cart?.summary.totalPrice || 0)
  const summarySubtotal = order ? Number(order.subtotal || 0) : cartTotal
  const summaryDiscount = order ? Number(order.discount || 0) : 0
  const summaryTotal = order ? Number(order.total || 0) : cartTotal
  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <div className="breadcrumbs">
        <Link to="/cart">Giỏ hàng</Link>
        <ChevronRight size={12} />
        <span>Thanh toán</span>
      </div>
      <div className="mb-8">
        <span className="label-mono">Checkout</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Hoàn tất đơn hàng</h1>
        <p className="mt-2 text-[13px] text-muted">Chỉ còn vài bước nữa để món đồ thuộc về bạn.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-4">
          <section className="border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center border border-line bg-paper font-mono text-[10px] text-ink">
                  01
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">Địa chỉ giao hàng</h2>
                  <p className="text-[11px] text-muted">Chọn nơi chúng mình gửi đơn tới.</p>
                </div>
              </div>
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent hover:text-ink"
                onClick={() => setAddingAddress((value) => !value)}
              >
                {addingAddress ? 'Đóng' : '+ Thêm địa chỉ'}
              </button>
            </div>

            <div className="grid gap-4 p-5">
              {addingAddress ? (
                <div className="border border-line bg-paper/60 p-4">
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
                <div className="grid gap-2">
                  {addresses.data.map((address) => {
                    const isSelected = addressId === address.id
                    return (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                          isSelected ? 'border-ink bg-paper/70' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          className="mt-1 accent-accent"
                          checked={isSelected}
                          onChange={() => setAddressId(address.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-[13px] font-semibold text-ink">{address.name}</strong>
                            <span className="font-mono text-[10px] text-muted">({address.phoneNumber})</span>
                            {address.isDefault ? (
                              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                                Mặc định
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{address.address}</p>
                          {address.note ? (
                            <p className="mt-1 font-mono text-[10px] text-muted">Ghi chú: {address.note}</p>
                          ) : null}
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <EmptyState title="Chưa có địa chỉ" text="Thêm một địa chỉ để tiếp tục đặt hàng." />
              )}
            </div>
          </section>

          <section className="border border-line bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="grid h-7 w-7 place-items-center border border-line bg-paper font-mono text-[10px] text-ink">
                02
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Mã ưu đãi</h2>
                <p className="text-[11px] text-muted">Nhập voucher nếu bạn có.</p>
              </div>
            </div>
            <div className="grid gap-3 p-5">
              <Input
                value={coupon}
                onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                placeholder="Nhập mã (VD: ECOMVIP)"
                aria-label="Mã ưu đãi"
                disabled={Boolean(orderId)}
                className="max-w-md font-mono uppercase tracking-[0.08em]"
              />
              {order ? (
                summaryDiscount > 0 ? (
                  <Alert variant="success">Đã áp dụng mã thành công. Tiết kiệm {money(summaryDiscount)}.</Alert>
                ) : coupon.trim() ? (
                  <Alert>Mã “{coupon.trim()}” không áp dụng được cho đơn này.</Alert>
                ) : null
              ) : (
                <p className="font-mono text-[10px] text-muted">Mã được kiểm tra khi bạn xác nhận tạo đơn.</p>
              )}
            </div>
          </section>

          <section className="flex items-start gap-3 border border-line bg-surface p-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-paper text-accent">
              <LockKeyhole size={17} />
            </span>
            <div>
              <strong className="block text-[13px] font-semibold text-ink">Thanh toán an toàn qua PayOS</strong>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Sau khi xác nhận, bạn sẽ được chuyển tới cổng thanh toán bảo mật SSL 256-bit.
              </p>
            </div>
          </section>

          {orderMutation.isError ? (
            <Alert variant="error">
              {orderMutation.error instanceof ApiError
                ? orderMutation.error.message
                : 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.'}
            </Alert>
          ) : null}

          {orderId ? (
            <Alert variant="success">Đơn #{orderId} đang chờ thanh toán. Bấm “Thanh toán ngay” để hoàn tất.</Alert>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            subtotal={summarySubtotal}
            discount={summaryDiscount}
            total={summaryTotal}
            action={
              orderId ? (
                <Button
                  className="w-full"
                  size="lg"
                  loading={paymentMutation.isPending}
                  onClick={() => void paymentMutation.mutateAsync(orderId)}
                >
                  Thanh toán ngay <ArrowUpRight size={16} />
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  loading={orderMutation.isPending}
                  disabled={!addressId || !cart?.items.length}
                  onClick={() => void orderMutation.mutateAsync()}
                >
                  Xác nhận đơn hàng <ArrowUpRight size={16} />
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
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setError('')
        void mutation
          .mutateAsync(values)
          .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không thể thêm địa chỉ.'))
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên người nhận" error={form.formState.errors.name?.message}>
          <Input {...form.register('name')} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Số điện thoại" error={form.formState.errors.phoneNumber?.message}>
          <Input {...form.register('phoneNumber')} inputMode="tel" placeholder="0912 345 678" />
        </Field>
      </div>
      <Field label="Địa chỉ" error={form.formState.errors.address?.message}>
        <Input {...form.register('address')} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
      </Field>
      <Field label="Ghi chú (không bắt buộc)" error={form.formState.errors.note?.message}>
        <Input {...form.register('note')} placeholder="Giao giờ hành chính…" />
      </Field>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button type="submit" loading={mutation.isPending} className="justify-self-start">
        Lưu địa chỉ
      </Button>
    </form>
  )
}
