import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleUserRound,
  Info,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react'
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false)
  }, [location.pathname])

  // Keyboard shortcut Ctrl+K or Cmd+K to focus search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    navigate(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
  }

  return (
    <div className="app-shell flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="mobile-menu"
            aria-label="Mở menu điều hướng"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="logo group">
            <span className="logo-mark">E</span>
            <span>
              <strong className="tracking-tight group-hover:text-blue-600 transition-colors">Ecommerce</strong>
              <small>electronics, simply</small>
            </span>
          </Link>
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={17} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm, thương hiệu..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <kbd title="Phím tắt tìm kiếm">⌘ K</kbd>
          </form>
          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink to="/products">Sản phẩm</NavLink>
            <a href="#benefits">Vì sao chọn Ecommerce</a>
            {user ? <NavLink to="/account/orders">Đơn hàng</NavLink> : <NavLink to="/login">Đăng nhập</NavLink>}
          </nav>
          <div className="header-actions">
            {isStaffUser(user) ? (
              <Link
                to="/admin"
                className="header-icon hover:text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Trang quản trị"
                title="Trang quản trị"
              >
                <LayoutDashboard size={20} />
              </Link>
            ) : null}
            <Link
              to={user ? '/account' : '/login'}
              className="header-icon hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label="Tài khoản"
              title={user ? `Tài khoản: ${user.name}` : 'Đăng nhập'}
            >
              <CircleUserRound size={20} />
            </Link>
            <Link
              to="/cart"
              className="header-icon cart-icon hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
              title="Giỏ hàng"
            >
              <ShoppingBag size={20} />
              {cartCount ? <b>{cartCount > 99 ? '99+' : cartCount}</b> : null}
            </Link>
            {user ? (
              <button className="header-logout" onClick={logout} title="Đăng xuất">
                Thoát
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {notice ? (
        <div className={`notice notice-${notice.kind}`} role="status">
          {notice.kind === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : notice.kind === 'error' ? (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          ) : (
            <Info size={18} className="text-blue-600 shrink-0" />
          )}
          <span className="font-medium text-slate-800">{notice.text}</span>
          <button onClick={clearNotice} aria-label="Đóng thông báo">
            <X size={15} />
          </button>
        </div>
      ) : null}

      <main className="flex-1">{children}</main>

      <footer className="site-footer bg-slate-900 text-white mt-20 border-t border-slate-800">
        <div className="footer-inner">
          <div className="space-y-3">
            <Link to="/" className="logo text-white">
              <span className="logo-mark">E</span>
              <span>
                <strong className="text-white text-lg">Ecommerce</strong>
                <small className="text-slate-400">electronics, simply</small>
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Thiết bị bạn cần, trải nghiệm bạn muốn. Mang đến công nghệ tinh gọn và chất lượng cho cuộc sống mỗi ngày.
            </p>
          </div>
          <div>
            <strong>Mua sắm</strong>
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/products?sortBy=createdAt">Hàng mới về</Link>
            <Link to="/products?sortBy=basePrice&sortOrder=asc">Giá tốt nhất</Link>
          </div>
          <div>
            <strong>Hỗ trợ & Tài khoản</strong>
            <a href="mailto:hello@elan.local">Trung tâm trợ giúp</a>
            <Link to="/account/orders">Theo dõi đơn hàng</Link>
            <Link to="/account/addresses">Sổ địa chỉ</Link>
          </div>
          <div>
            <strong>An tâm mua sắm</strong>
            <span className="footer-trust">
              <ShieldCheck size={16} className="text-blue-400" /> Thanh toán bảo mật SSL
            </span>
            <span className="footer-trust">
              <Truck size={16} className="text-blue-400" /> Giao hàng nhanh toàn quốc
            </span>
          </div>
        </div>
        <div className="footer-bottom text-slate-400 text-xs py-6 border-t border-slate-800/80 text-center">
          © 2026 Ecommerce · Được xây dựng với tiêu chuẩn hiện đại cho trải nghiệm mua sắm mượt mà.
        </div>
      </footer>
    </div>
  )
}
