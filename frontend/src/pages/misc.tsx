import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, ShieldCheck, X } from 'lucide-react'
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
    <section className="page-section result-page">
      <div className={`result-icon ${success ? 'success' : 'cancel'}`}>
        {success ? <ShieldCheck size={36} /> : <X size={36} />}
      </div>
      <span className="eyebrow">PAYMENT {success ? 'COMPLETE' : verifying ? 'VERIFYING' : 'CANCELLED'}</span>
      <h1>
        {success
          ? 'Thanh toán đã được xác nhận.'
          : verifying
            ? 'Đang xác nhận thanh toán.'
            : 'Thanh toán chưa hoàn tất.'}
      </h1>
      <p>
        {success
          ? 'Webhook PayOS đã được backend xác nhận và trạng thái đơn hàng đã được cập nhật.'
          : verifying
            ? 'PayOS đã đưa bạn quay lại cửa hàng. Hệ thống đang chờ backend xác nhận giao dịch.'
            : returnedCancel
              ? 'Bạn đã hủy tại PayOS. Đơn hàng vẫn được giữ để bạn có thể thanh toán lại.'
              : 'Không thể xác nhận trạng thái thanh toán. Hãy kiểm tra lại đơn hàng.'}
      </p>
      <div className="result-actions">
        <Link to={orderUrl} className="button button-primary">
          {success ? 'Xem đơn hàng' : 'Xem đơn và thanh toán lại'} <ArrowRight size={17} />
        </Link>
        <Link to="/products" className="text-link">
          Tiếp tục mua sắm
        </Link>
      </div>
    </section>
  )
}
export function NotFoundPage() {
  return (
    <section className="page-section result-page">
      <div className="result-icon cancel">
        <Search size={34} />
      </div>
      <span className="eyebrow">404</span>
      <h1>Trang này đang đi lạc.</h1>
      <p>Hãy quay lại cửa hàng để tiếp tục khám phá.</p>
      <Link to="/products" className="button button-primary">
        Tới sản phẩm <ArrowRight size={17} />
      </Link>
    </section>
  )
}
