import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CircleUserRound, LayoutDashboard, Menu, Search, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { isStaffUser, useAuth, useCommerce } from '../app-context'
import type { Notice } from '../app-context'

export function StoreLayout({
  children,
  notice,
  clearNotice,
}: {
  children: ReactNode
  notice: Notice | null
  clearNotice: () => void
}) {
  const { user, logout } = useAuth()
  const { cartCount } = useCommerce()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState(new URLSearchParams(location.search).get('search') || '')
  useEffect(() => {
    // Close the mobile navigation whenever routing changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false)
  }, [location.pathname])
  function submitSearch(event: FormEvent) {
    event.preventDefault()
    navigate(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="mobile-menu" aria-label="Mở menu" onClick={() => setMenuOpen((value) => !value)}>
            <Menu size={20} />
          </button>
          <Link to="/" className="logo">
            <span className="logo-mark">E</span>
            <span>
              <strong>Élan</strong>
              <small>electronics, simply</small>
            </span>
          </Link>
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm, thương hiệu..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <kbd>⌘ K</kbd>
          </form>
          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink to="/products">Sản phẩm</NavLink>
            <a href="#benefits">Vì sao chọn Élan</a>
            {user ? <NavLink to="/account/orders">Đơn hàng</NavLink> : <NavLink to="/login">Đăng nhập</NavLink>}
          </nav>
          <div className="header-actions">
            {isStaffUser(user) ? (
              <Link to="/admin" className="header-icon" aria-label="Trang quản trị" title="Quản trị">
                <LayoutDashboard size={21} />
              </Link>
            ) : null}
            <Link to={user ? '/account' : '/login'} className="header-icon" aria-label="Tài khoản">
              <CircleUserRound size={21} />
            </Link>
            <Link to="/cart" className="header-icon cart-icon" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}>
              <ShoppingBag size={21} />
              {cartCount ? <b>{cartCount > 99 ? '99+' : cartCount}</b> : null}
            </Link>
            {user ? (
              <button className="header-logout" onClick={logout}>
                Thoát
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {notice ? (
        <div className={`notice notice-${notice.kind}`} role="status">
          <span>{notice.text}</span>
          <button onClick={clearNotice} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      ) : null}
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Link to="/" className="logo">
              <span className="logo-mark">E</span>
              <span>
                <strong>Élan</strong>
                <small>electronics, simply</small>
              </span>
            </Link>
            <p>Thiết bị bạn cần, trải nghiệm bạn muốn.</p>
          </div>
          <div>
            <strong>Mua sắm</strong>
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/products?sortBy=createdAt">Hàng mới về</Link>
          </div>
          <div>
            <strong>Hỗ trợ</strong>
            <a href="mailto:hello@elan.local">Liên hệ</a>
            <Link to="/account/orders">Theo dõi đơn hàng</Link>
          </div>
          <div>
            <strong>An tâm mua sắm</strong>
            <span className="footer-trust">
              <ShieldCheck size={16} /> Thanh toán bảo mật
            </span>
            <span className="footer-trust">
              <Truck size={16} /> Giao hàng rõ ràng
            </span>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Élan Commerce · Được xây dựng cho trải nghiệm mua sắm nhẹ nhàng.</div>
      </footer>
    </div>
  )
}
