import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Package, Star, Trash2, Truck, UserRound } from 'lucide-react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { ApiError, api, getAccessToken, getRefreshToken } from '../api'
import { date, initials, money, skuLabel } from '../lib'
import { useAuth } from '../app-context'
import { RequireAuth, AddressForm } from './checkout'
import { Button, EmptyState, ErrorState, Field, PageLoader } from '../components/ui'
import type { Address, Order, User } from '../types'

export function AccountPage() {
  const { user } = useAuth()
  if (!user)
    return (
      <RequireAuth>
        <AccountPage />
      </RequireAuth>
    )
  return (
    <section className="page-section account-page">
      <div className="account-welcome">
        <div className="profile-avatar">{initials(user.name)}</div>
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Chào {user.name.split(' ').slice(-1)[0]}.</h1>
          <p>Quản lý đơn hàng, địa chỉ và thông tin tài khoản.</p>
        </div>
      </div>
      <div className="account-grid">
        <AccountCard
          to="/account/orders"
          icon={<Package size={22} />}
          title="Đơn hàng của tôi"
          text="Theo dõi trạng thái và lịch sử mua sắm."
        />
        <AccountCard
          to="/account/addresses"
          icon={<Truck size={22} />}
          title="Địa chỉ giao hàng"
          text="Lưu nơi nhận hàng yêu thích của bạn."
        />
        <AccountCard
          to="/account"
          icon={<UserRound size={22} />}
          title="Thông tin cá nhân"
          text="Cập nhật tên và số điện thoại."
        />
      </div>
      <ProfileForm />
    </section>
  )
}
function AccountCard({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="account-card">
      {icon}
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <ArrowRight size={17} />
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
    <div className="account-form-card profile-form-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">PROFILE</span>
          <h2>Thông tin cá nhân</h2>
        </div>
      </div>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault()
          void mutation.mutateAsync()
        }}
      >
        <div className="form-grid">
          <Field label="Họ và tên">
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Số điện thoại">
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
              inputMode="tel"
            />
          </Field>
        </div>
        {message ? <div className="inline-alert success">{message}</div> : null}
        {error ? <div className="inline-alert error">{error}</div> : null}
        <Button type="submit" loading={mutation.isPending}>
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
  if (!user)
    return (
      <RequireAuth>
        <OrdersPage />
      </RequireAuth>
    )
  return (
    <section className="page-section account-section">
      <AccountNav />
      <div className="section-head">
        <div>
          <span className="eyebrow">ORDER HISTORY</span>
          <h1>Đơn hàng của tôi</h1>
        </div>
      </div>
      {orders.isError ? (
        <ErrorState onRetry={() => void orders.refetch()} />
      ) : orders.isLoading ? (
        <PageLoader />
      ) : orders.data?.data.length ? (
        <div className="order-list">
          {orders.data.data.map((order) => (
            <Link to={`/account/orders/${order.id}`} className="order-card" key={order.id}>
              <div>
                <span className="order-id">Đơn hàng #{order.id}</span>
                <small>
                  {date(order.createdAt)} · {order.items.length} sản phẩm
                </small>
              </div>
              <div className="order-card-right">
                <span className={`status status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                <strong>{money(order.total)}</strong>
                <ChevronRight size={17} />
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
    </section>
  )
}
function AccountNav() {
  return (
    <nav className="account-nav">
      <NavLink to="/account/orders">Đơn hàng</NavLink>
      <NavLink to="/account/addresses">Địa chỉ</NavLink>
      <NavLink to="/account">Tài khoản</NavLink>
      <NavLink to="/account/security">Bảo mật</NavLink>
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
  if (!user)
    return (
      <RequireAuth>
        <OrderDetailPage />
      </RequireAuth>
    )
  if (query.isLoading) return <PageLoader />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const order = query.data
  return (
    <section className="page-section account-section">
      <div className="breadcrumbs">
        <Link to="/account/orders">Đơn hàng</Link>
        <ChevronRight size={14} />
        <span>#{order.id}</span>
      </div>
      <div className="order-detail-head">
        <div>
          <span className="eyebrow">ORDER DETAIL</span>
          <h1>Đơn hàng #{order.id}</h1>
          <p>Đặt ngày {date(order.createdAt)}</p>
        </div>
        <span className={`status status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
      </div>
      <div className="order-detail-layout">
        <div>
          <div className="order-timeline">
            <span className="timeline-active" />
            <div>
              <strong>Đơn hàng đã được ghi nhận</strong>
              <p>Chúng mình sẽ cập nhật bạn ở mỗi bước tiếp theo.</p>
            </div>
          </div>
          <div className="order-items">
            {order.items.map((item) => (
              <div className="order-item" key={item.id}>
                <img src={item.image || 'https://placehold.co/120x120/f4f1eb/1d2433?text=E'} alt={item.productName} />
                <div>
                  <strong>{item.productName}</strong>
                  <small>
                    {skuLabel({ value: item.skuValue || undefined })} · SL {item.quantity}
                  </small>
                </div>
                <b>{money(Number(item.skuPrice) * item.quantity)}</b>
              </div>
            ))}
          </div>
          {order.status === 'DELIVERED' ? (
            <div className="review-forms">
              <h3>Chia sẻ trải nghiệm</h3>
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
            <Button variant="danger" loading={cancel.isPending} onClick={() => void cancel.mutateAsync()}>
              Hủy đơn hàng
            </Button>
          ) : null}
        </div>
        <aside className="order-summary">
          <h2>Tóm tắt</h2>
          <div>
            <span>Tạm tính</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div>
            <span>Giảm giá</span>
            <strong className="success-text">-{money(order.discount)}</strong>
          </div>
          <hr />
          <div className="summary-total">
            <span>Tổng cộng</span>
            <strong>{money(order.total)}</strong>
          </div>
          {order.receiver ? (
            <div className="receiver">
              <small>Giao tới</small>
              <strong>{order.receiver.name}</strong>
              <span>{order.receiver.phoneNumber}</span>
              <span>{order.receiver.address}</span>
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
  if (submitted) return <div className="inline-alert success">Cảm ơn bạn đã đánh giá {productName}.</div>
  return (
    <form
      className="review-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (content.trim()) void mutation.mutateAsync()
      }}
    >
      <strong>{productName}</strong>
      <div className="review-rating-input" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={value <= rating ? 'active' : ''}
            onClick={() => setRating(value)}
            aria-label={`${value} sao`}
          >
            <Star size={18} fill="currentColor" />
          </button>
        ))}
      </div>
      <textarea
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
      />
      {mutation.isError ? (
        <div className="inline-alert error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Không thể gửi đánh giá.'}
        </div>
      ) : null}
      <Button type="submit" loading={mutation.isPending}>
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
  if (!user)
    return (
      <RequireAuth>
        <AddressesPage />
      </RequireAuth>
    )
  const remove = async (id: number) => {
    await api(`/addresses/${id}`, { method: 'DELETE' })
    await query.refetch()
  }
  return (
    <section className="page-section account-section">
      <AccountNav />
      <div className="section-head">
        <div>
          <span className="eyebrow">DELIVERY</span>
          <h1>Địa chỉ giao hàng</h1>
        </div>
        <Button onClick={() => setAdding((value) => !value)}>{adding ? 'Đóng' : '+ Thêm địa chỉ'}</Button>
      </div>
      {adding ? (
        <div className="account-form-card">
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
        <div className="saved-addresses">
          {query.data?.map((address) => (
            <article className="saved-address" key={address.id}>
              <div>
                <div className="address-title">
                  <strong>{address.name}</strong>
                  {address.isDefault ? <span>Mặc định</span> : null}
                </div>
                <p>{address.phoneNumber}</p>
                <p>{address.address}</p>
              </div>
              <button className="remove-button" onClick={() => void remove(address.id)}>
                <Trash2 size={16} /> Xóa
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
