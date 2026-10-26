import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ChevronRight, Package, Star, Trash2, Truck, UserRound } from 'lucide-react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { ApiError, api, getAccessToken, getRefreshToken } from '../api'
import { date, initials, money, productImage, skuLabel } from '../lib'
import { useAuth } from '../app-context'
import { AddressForm } from './checkout'
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Input, PageLoader, Textarea } from '../components/ui'
import type { Address, Order, User } from '../types'

export function AccountPage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center border border-line bg-surface font-mono text-lg text-ink">
            {initials(user.name)}
          </div>
          <div>
            <span className="label-mono">Your space</span>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Chào {user.name.split(' ').slice(-1)[0]}.
            </h1>
            <p className="mt-1 text-[13px] text-muted">Quản lý đơn hàng, địa chỉ và thông tin tài khoản.</p>
          </div>
        </div>
        <AccountNav />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <AccountCard
          to="/account/orders"
          icon={<Package size={20} />}
          title="Đơn hàng của tôi"
          text="Theo dõi trạng thái và lịch sử mua sắm."
        />
        <AccountCard
          to="/account/addresses"
          icon={<Truck size={20} />}
          title="Địa chỉ giao hàng"
          text="Lưu nơi nhận hàng yêu thích của bạn."
        />
        <AccountCard
          to="/account/security"
          icon={<UserRound size={20} />}
          title="Bảo mật"
          text="Đổi mật khẩu và bật xác thực hai bước."
        />
      </div>

      <ProfileForm />
    </section>
  )
}

function AccountCard({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-4 border border-line bg-surface p-5 transition-colors hover:border-ink"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-paper text-accent">{icon}</span>
        <div>
          <strong className="block text-[13px] font-semibold text-ink">{title}</strong>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{text}</p>
        </div>
      </div>
      <ArrowUpRight size={15} className="mt-1 shrink-0 text-muted transition-colors group-hover:text-ink" />
    </Link>
  )
}

function ProfileForm() {
  const { user, login } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => api<User>('/users/me', { method: 'PATCH', body: JSON.stringify({ name, phoneNumber }) }),
    onSuccess: (updated) => {
      if (user) login(updated, getAccessToken() || '', getRefreshToken() || '')
      setMessage('Thông tin cá nhân đã được cập nhật.')
      setError('')
    },
    onError: (reason: unknown) => {
      setError(reason instanceof ApiError ? reason.message : 'Không thể cập nhật thông tin.')
      setMessage('')
    },
  })
  return (
    <div className="mt-10 max-w-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <span className="label-mono">Profile</span>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Thông tin cá nhân</h2>
      </div>
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          void mutation.mutateAsync()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Số điện thoại">
            <Input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
              inputMode="tel"
            />
          </Field>
        </div>
        {message ? <Alert variant="success">{message}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Button type="submit" loading={mutation.isPending} className="justify-self-start">
          Lưu thay đổi
        </Button>
      </form>
    </div>
  )
}

export function OrdersPage() {
  const { user } = useAuth()
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<{ data: Order[] }>('/orders?page=1&limit=20'),
    enabled: Boolean(user),
  })
  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <AccountNav />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="label-mono">Order history</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Đơn hàng của tôi</h1>
        </div>
      </div>
      <div className="mt-6">
        {orders.isError ? (
          <ErrorState onRetry={() => void orders.refetch()} />
        ) : orders.isLoading ? (
          <PageLoader />
        ) : orders.data?.data.length ? (
          <div className="border-t border-line">
            {orders.data.data.map((order) => (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="grid gap-3 border-b border-line py-5 transition-colors hover:bg-surface sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <span className="font-mono text-[12px] text-ink">Đơn hàng #{order.id}</span>
                  <small className="mt-1 block font-mono text-[10px] text-muted">
                    {date(order.createdAt)} · {order.items.length} sản phẩm
                  </small>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={order.status} />
                  <strong className="font-mono text-[13px] font-medium text-ink">{money(order.total)}</strong>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Bạn chưa có đơn hàng"
            text="Những món đồ đầu tiên đang chờ bạn."
            action={
              <Link to="/products" className="button button-primary">
                Khám phá sản phẩm
              </Link>
            }
          />
        )}
      </div>
    </section>
  )
}

export function AccountNav() {
  return (
    <nav className="flex flex-wrap items-center gap-5 font-mono text-[10px] uppercase tracking-[0.12em]">
      {[
        { to: '/account/orders', label: 'Đơn hàng', end: false },
        { to: '/account/addresses', label: 'Địa chỉ', end: false },
        { to: '/account', label: 'Tài khoản', end: true },
        { to: '/account/security', label: 'Bảo mật', end: false },
      ].map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `border-b pb-1 transition-colors ${isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    PENDING_PICKUP: 'Đang chuẩn bị',
    PENDING_DELIVERY: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Đã trả hàng',
  }
  return labels[status] || status
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'DELIVERED'
      ? 'success'
      : status === 'CANCELLED' || status === 'RETURNED'
        ? 'danger'
        : status === 'PENDING_PAYMENT'
          ? 'accent'
          : 'default'
  return <Badge variant={variant}>{statusLabel(status)}</Badge>
}

export function OrderDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<Order>(`/orders/${id}`),
    enabled: Boolean(user && id),
  })
  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => void query.refetch(),
  })
  const payment = useMutation({
    mutationFn: () =>
      api<{ checkoutUrl: string }>('/payments', { method: 'POST', body: JSON.stringify({ orderId: Number(id) }) }),
    onSuccess: (result) => {
      localStorage.setItem('ecommerce-pending-order-id', String(id))
      if (result.checkoutUrl) window.location.href = result.checkoutUrl
    },
  })
  if (query.isLoading) return <PageLoader />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const order = query.data
  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <div className="breadcrumbs">
        <Link to="/account/orders">Đơn hàng</Link>
        <ChevronRight size={12} />
        <span>#{order.id}</span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="label-mono">Order detail</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Đơn hàng #{order.id}</h1>
          <p className="mt-1 text-[12px] text-muted">Đặt ngày {date(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <div className="flex items-start gap-3 border border-line bg-surface p-4">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
            <div>
              <strong className="block text-[13px] font-semibold text-ink">Đơn hàng đã được ghi nhận</strong>
              <p className="mt-1 text-[12px] text-muted">Chúng mình sẽ cập nhật bạn ở mỗi bước tiếp theo.</p>
            </div>
          </div>

          <div className="mt-6 border-t border-line">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-4"
              >
                <img
                  src={item.image || productImage(null)}
                  alt={item.productName}
                  className="h-16 w-16 border border-line bg-paper-deep object-contain p-1.5"
                />
                <div className="min-w-0">
                  <strong className="block text-[13px] font-medium text-ink">{item.productName}</strong>
                  <small className="mt-1 block font-mono text-[10px] text-muted">
                    {skuLabel({ value: item.skuValue || undefined })} · SL {item.quantity}
                  </small>
                </div>
                <b className="font-mono text-[12px] font-medium text-ink">
                  {money(Number(item.skuPrice) * item.quantity)}
                </b>
              </div>
            ))}
          </div>

          {order.status === 'DELIVERED' ? (
            <div className="mt-6 grid gap-4 border border-line bg-surface p-5">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">Chia sẻ trải nghiệm</h3>
              {order.items
                .filter((item) => item.productId)
                .map((item) => (
                  <ReviewForm
                    key={item.id}
                    orderId={order.id}
                    productId={item.productId!}
                    productName={item.productName}
                  />
                ))}
            </div>
          ) : null}

          {order.status === 'PENDING_PAYMENT' ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button loading={payment.isPending} onClick={() => void payment.mutateAsync()}>
                Thanh toán ngay
              </Button>
              <Button variant="danger" loading={cancel.isPending} onClick={() => void cancel.mutateAsync()}>
                Hủy đơn hàng
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="border-b border-line pb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">
            Tóm tắt
          </h2>
          <div className="mt-4 grid gap-3 text-[12px]">
            <div className="flex justify-between gap-4 text-muted">
              <span>Tạm tính</span>
              <strong className="font-mono font-medium text-ink">{money(order.subtotal)}</strong>
            </div>
            <div className="flex justify-between gap-4 text-muted">
              <span>Giảm giá</span>
              <strong className="font-mono font-medium text-success">-{money(order.discount)}</strong>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[12px] font-semibold text-ink">Tổng cộng</span>
            <strong className="font-mono text-lg font-medium text-accent">{money(order.total)}</strong>
          </div>
          {order.receiver ? (
            <div className="mt-4 grid gap-1 border-t border-line pt-4">
              <span className="label-mono">Giao tới</span>
              <strong className="text-[12px] font-semibold text-ink">{order.receiver.name}</strong>
              <span className="text-[11px] text-muted">{order.receiver.phoneNumber}</span>
              <span className="text-[11px] text-muted">{order.receiver.address}</span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function ReviewForm({ orderId, productId, productName }: { orderId: number; productId: number; productName: string }) {
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const mutation = useMutation({
    mutationFn: async () => {
      const review = await api<{ id: number }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({ orderId, productId, rating, content: content.trim() }),
      })
      await Promise.all(
        files.slice(0, 5).map((file) => {
          const formData = new FormData()
          formData.append('media', file)
          return api(`/reviews/${review.id}/media`, { method: 'POST', body: formData })
        }),
      )
      return review
    },
    onSuccess: () => setSubmitted(true),
  })
  if (submitted) return <Alert variant="success">Cảm ơn bạn đã đánh giá {productName}.</Alert>
  return (
    <form
      className="grid gap-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (content.trim()) void mutation.mutateAsync()
      }}
    >
      <strong className="text-[13px] font-medium text-ink">{productName}</strong>
      <div className="flex gap-1" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={value <= rating ? 'text-accent' : 'text-line-strong'}
            onClick={() => setRating(value)}
            aria-label={`${value} sao`}
            aria-pressed={value === rating}
          >
            <Star size={17} fill="currentColor" />
          </button>
        ))}
      </div>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        minLength={1}
        maxLength={2000}
        required
        placeholder="Điều bạn thích ở sản phẩm này?"
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))}
        aria-label="Ảnh đánh giá (không bắt buộc)"
        className="font-mono text-[10px] text-muted"
      />
      {mutation.isError ? (
        <Alert variant="error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Không thể gửi đánh giá.'}
        </Alert>
      ) : null}
      <Button type="submit" loading={mutation.isPending} className="justify-self-start">
        Gửi đánh giá
      </Button>
    </form>
  )
}

export function AddressesPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<Address[]>('/addresses'),
    enabled: Boolean(user),
  })
  const [adding, setAdding] = useState(false)
  const remove = async (id: number) => {
    if (!window.confirm('Xóa địa chỉ này?')) return
    await api(`/addresses/${id}`, { method: 'DELETE' })
    await query.refetch()
  }
  return (
    <section className="page-shell py-8 pb-24 sm:py-10">
      <AccountNav />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="label-mono">Delivery</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Địa chỉ giao hàng</h1>
        </div>
        <Button variant="secondary" onClick={() => setAdding((value) => !value)}>
          {adding ? 'Đóng' : '+ Thêm địa chỉ'}
        </Button>
      </div>
      {adding ? (
        <div className="mt-6 border border-line bg-surface p-5">
          <AddressForm
            onCreated={() => {
              setAdding(false)
              void query.refetch()
            }}
          />
        </div>
      ) : null}
      {query.isLoading ? (
        <PageLoader />
      ) : (
        <div className="mt-6 border-t border-line">
          {query.data?.map((address) => (
            <article key={address.id} className="flex items-start justify-between gap-4 border-b border-line py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[13px] font-semibold text-ink">{address.name}</strong>
                  {address.isDefault ? <Badge variant="outline">Mặc định</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted">{address.phoneNumber}</p>
                <p className="mt-1 text-[12px] text-ink-soft">{address.address}</p>
              </div>
              <button
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-danger"
                onClick={() => void remove(address.id)}
                aria-label={`Xóa địa chỉ của ${address.name}`}
              >
                <Trash2 size={14} /> Xóa
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
