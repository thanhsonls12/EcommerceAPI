import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CircleUserRound, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { isStaffUser, useAuth, useCommerce } from '../app-context'
import { BrandLogo } from './BrandLogo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

const searchShortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'

const storeLinks = [
  { to: '/products', label: 'Sản phẩm' },
  { to: '/#benefits', label: 'Vì sao chọn Ecommerce' },
]

export function StoreLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { cartCount } = useCommerce()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false)
  }, [location.pathname])

  const urlSearch = new URLSearchParams(location.search).get('search') || ''
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.hash, location.pathname])

  useEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(location.hash.slice(1))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [location.hash, location.pathname])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    navigate(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
    setMenuOpen(false)
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
      isActive ? 'text-ink' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>

      <div className="bg-ink text-paper">
        <div className="page-shell flex h-9 items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.14em]">
          <span>Thiết bị chính hãng · Giao hàng toàn quốc</span>
          <span className="hidden sm:inline">Đổi trả trong 7 ngày · Bảo hành chính hãng</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95">
        <div className="page-shell flex h-16 items-center gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="grid h-10 w-10 place-items-center text-ink lg:hidden" aria-label="Mở menu điều hướng">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(88vw,22rem)]">
              <SheetHeader>
                <SheetTitle>Danh mục</SheetTitle>
                <SheetDescription>Điều hướng cửa hàng và tài khoản.</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-1 border-y border-line py-3" aria-label="Điều hướng di động">
                {storeLinks.map((link) => (
                  <SheetClose asChild key={link.to}>
                    <Link
                      to={link.to}
                      className="px-1 py-3 text-[15px] font-medium text-ink transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {user ? (
                  <SheetClose asChild>
                    <Link to="/account/orders" className="px-1 py-3 text-[15px] font-medium text-ink hover:text-accent">
                      Đơn hàng
                    </Link>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link to="/login" className="px-1 py-3 text-[15px] font-medium text-ink hover:text-accent">
                      Đăng nhập
                    </Link>
                  </SheetClose>
                )}
              </nav>
              <form
                className="flex items-center border border-line-strong bg-surface px-3"
                role="search"
                onSubmit={submitSearch}
              >
                <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm sản phẩm, thương hiệu…"
                  aria-label="Tìm kiếm sản phẩm"
                  className="h-11 w-full bg-transparent px-2 text-[13px] text-ink outline-none placeholder:text-muted/70"
                />
              </form>
              {user ? (
                <div className="grid gap-1">
                  <span className="label-mono">{user.name}</span>
                  <Link to="/account" className="py-2 text-[13px] text-ink-soft hover:text-ink">
                    Tài khoản
                  </Link>
                  <Link to="/account/addresses" className="py-2 text-[13px] text-ink-soft hover:text-ink">
                    Địa chỉ
                  </Link>
                  <button
                    className="py-2 text-left text-[13px] text-ink-soft hover:text-danger"
                    onClick={() => {
                      logout()
                      setMenuOpen(false)
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <BrandLogo size={30} />
            <span className="text-[15px] font-semibold tracking-[-0.045em]">Ecommerce</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted sm:inline">
              electronics, simply
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Điều hướng chính">
            {storeLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <NavLink to="/account/orders" className={navLinkClass}>
                Đơn hàng
              </NavLink>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                Đăng nhập
              </NavLink>
            )}
          </nav>

          <form
            className="ml-auto hidden w-full max-w-xs items-center border border-line-strong bg-surface px-3 md:flex"
            role="search"
            onSubmit={submitSearch}
          >
            <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm…"
              aria-label="Tìm kiếm sản phẩm"
              className="h-10 w-full bg-transparent px-2 text-[12px] text-ink outline-none placeholder:text-muted/70"
            />
            <kbd className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {searchShortcutLabel}
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            {isStaffUser(user) ? (
              <Link
                to="/admin"
                className="grid h-10 w-10 place-items-center text-muted transition-colors hover:bg-paper-deep hover:text-ink"
                aria-label="Trang quản trị"
                title="Trang quản trị"
              >
                <LayoutDashboard size={19} />
              </Link>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid h-10 w-10 place-items-center text-muted transition-colors hover:bg-paper-deep hover:text-ink"
                  aria-label="Tài khoản"
                >
                  <CircleUserRound size={19} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <p className="-mt-1 px-2.5 pb-2 font-mono text-[10px] text-muted">{user.email}</p>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account">
                        <UserRound size={14} /> Tài khoản
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/orders">Đơn hàng</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/addresses">Địa chỉ</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/security">Bảo mật</Link>
                    </DropdownMenuItem>
                    {isStaffUser(user) ? (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <LayoutDashboard size={14} /> Quản trị
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={logout}>
                      <LogOut size={14} /> Đăng xuất
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>Khách</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/login">Đăng nhập</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register">Tạo tài khoản</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center text-muted transition-colors hover:bg-paper-deep hover:text-ink"
              aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
              title="Giỏ hàng"
            >
              <ShoppingBag size={19} />
              {cartCount ? (
                <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center bg-accent px-1 font-mono text-[9px] leading-4 text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="border-t border-line md:hidden">
          <form className="page-shell flex items-center py-2" role="search" onSubmit={submitSearch}>
            <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm, thương hiệu…"
              aria-label="Tìm kiếm sản phẩm"
              className="h-9 w-full bg-transparent px-2 text-[12px] text-ink outline-none placeholder:text-muted/70"
            />
          </form>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="mt-20 border-t border-line bg-ink text-paper">
        <div className="page-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="grid content-start gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <BrandLogo size={30} variant="light" />
              <span className="text-[15px] font-semibold tracking-[-0.045em]">Ecommerce</span>
            </Link>
            <p className="max-w-xs text-[12px] leading-relaxed text-paper/55">
              Thiết bị bạn cần, trải nghiệm bạn muốn. Công nghệ tinh gọn và chất lượng cho cuộc sống mỗi ngày.
            </p>
          </div>
          <div className="grid content-start gap-2.5">
            <strong className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/45">Mua sắm</strong>
            <Link to="/products" className="text-[12px] text-paper/70 hover:text-paper">
              Tất cả sản phẩm
            </Link>
            <Link to="/products?sortBy=createdAt" className="text-[12px] text-paper/70 hover:text-paper">
              Hàng mới về
            </Link>
            <Link to="/products?sortBy=price&sortOrder=asc" className="text-[12px] text-paper/70 hover:text-paper">
              Giá tốt nhất
            </Link>
          </div>
          <div className="grid content-start gap-2.5">
            <strong className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/45">Hỗ trợ</strong>
            <a href="mailto:hello@elan.local" className="text-[12px] text-paper/70 hover:text-paper">
              Trung tâm trợ giúp
            </a>
            <Link to="/account/orders" className="text-[12px] text-paper/70 hover:text-paper">
              Theo dõi đơn hàng
            </Link>
            <Link to="/account/addresses" className="text-[12px] text-paper/70 hover:text-paper">
              Sổ địa chỉ
            </Link>
          </div>
          <div className="grid content-start gap-2.5">
            <strong className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/45">An tâm mua sắm</strong>
            <span className="text-[12px] text-paper/70">Thanh toán bảo mật SSL</span>
            <span className="text-[12px] text-paper/70">Giao hàng nhanh toàn quốc</span>
            <span className="text-[12px] text-paper/70">Đổi trả trong 7 ngày</span>
          </div>
        </div>
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 py-5 font-mono text-[9px] uppercase tracking-[0.12em] text-paper/40">
          <span>© 2026 Ecommerce</span>
          <span>Made for everyday rituals</span>
        </div>
      </footer>
    </div>
  )
}
