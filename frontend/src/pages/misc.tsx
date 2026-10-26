import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search, ShieldCheck, X } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../app-context'
import { PageLoader } from '../components/ui'
import type { PaymentStatus } from '../types'

export function PaymentPage() {
  const { state } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const attempts = useRef(0)
  const params = new URLSearchParams(location.search)
  const paymentId = Number(params.get('orderCode'))
  const returnedSuccess = state === 'success'
  const returnedCancel = state === 'cancel'
  const payment = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => api<PaymentStatus>(`/payments/${paymentId}/status`),
    enabled: Boolean(user && Number.isSafeInteger(paymentId) && paymentId > 0),
    retry: false,
    refetchInterval: (query) => {
      if (!returnedSuccess || query.state.data?.status !== 'PENDING' || attempts.current >= 8) return false
      attempts.current += 1
      return 1500
    },
  })
  useEffect(() => {
    if (payment.data?.orderStatus !== 'PENDING_PAYMENT') localStorage.removeItem('ecommerce-pending-order-id')
    else if (payment.data?.orderId) localStorage.setItem('ecommerce-pending-order-id', String(payment.data.orderId))
  }, [payment.data])

  if (!user)
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) return <Navigate to="/account/orders" replace />
  if (payment.isLoading) return <PageLoader />

  const confirmed = payment.data?.status === 'SUCCESS' || payment.data?.orderStatus === 'PENDING_PICKUP'
  const verifying = returnedSuccess && !confirmed && !payment.isError
  const success = returnedSuccess && confirmed
  const orderUrl = payment.data?.orderId ? `/account/orders/${payment.data.orderId}` : '/account/orders'
  return (
    <section className="page-shell grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-lg">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center border ${
            success ? 'border-success/30 bg-success-soft text-success' : 'border-danger/30 bg-danger-soft text-danger'
          }`}
        >
          {success ? <ShieldCheck size={30} /> : <X size={30} />}
        </div>
        <span className="label-mono mt-6 block">
          Payment {success ? 'complete' : verifying ? 'verifying' : 'cancelled'}
        </span>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          {success
            ? 'Thanh toán đã được xác nhận.'
            : verifying
              ? 'Đang xác nhận thanh toán.'
              : 'Thanh toán chưa hoàn tất.'}
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {success
            ? 'Webhook PayOS đã được backend xác nhận và trạng thái đơn hàng đã được cập nhật.'
            : verifying
              ? 'PayOS đã đưa bạn quay lại cửa hàng. Hệ thống đang chờ backend xác nhận giao dịch.'
              : returnedCancel
                ? 'Bạn đã hủy tại PayOS. Đơn hàng vẫn được giữ để bạn có thể thanh toán lại.'
                : 'Không thể xác nhận trạng thái thanh toán. Hãy kiểm tra lại đơn hàng.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to={orderUrl} className="button button-primary">
            {success ? 'Xem đơn hàng' : 'Xem đơn và thanh toán lại'} <ArrowUpRight size={16} />
          </Link>
          <Link to="/products" className="text-link">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section className="page-shell grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-lg">
        <div className="mx-auto grid h-16 w-16 place-items-center border border-line bg-surface text-accent">
          <Search size={28} />
        </div>
        <span className="label-mono mt-6 block">404</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Trang này đang đi lạc.</h1>
        <p className="mt-4 text-[13px] text-muted">Hãy quay lại cửa hàng để tiếp tục khám phá.</p>
        <Link to="/products" className="button button-primary mt-8">
          Tới sản phẩm <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  )
}
