import { ArrowRight, Search, ShieldCheck, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

export function PaymentPage() {
  const { state } = useParams()
  const success = state === 'success'
  return (
    <section className="page-section result-page">
      <div className={`result-icon ${success ? 'success' : 'cancel'}`}>
        {success ? <ShieldCheck size={36} /> : <X size={36} />}
      </div>
      <span className="eyebrow">PAYMENT {success ? 'COMPLETE' : 'CANCELLED'}</span>
      <h1>{success ? 'Cảm ơn bạn đã mua sắm.' : 'Thanh toán chưa hoàn tất.'}</h1>
      <p>
        {success
          ? 'PayOS đã đưa bạn quay lại cửa hàng. Trạng thái đơn sẽ được xác nhận theo webhook.'
          : 'Bạn có thể quay lại checkout để thử lại bất cứ lúc nào.'}
      </p>
      <div className="result-actions">
        <Link to={success ? '/account/orders' : '/checkout'} className="button button-primary">
          {success ? 'Xem đơn hàng' : 'Quay lại checkout'} <ArrowRight size={17} />
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
