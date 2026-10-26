import { type ReactNode } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Boxes, LayoutDashboard, Package, Percent, Tag, Users, Warehouse } from 'lucide-react'
import { hasAccessToken } from '../../api'
import { isStaffUser, useAuth } from '../../app-context'
import { PageLoader } from '../../components/ui'
import { BrandLogo } from '../../components/BrandLogo'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user)
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (!isStaffUser(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

const links = [
  { to: '/admin', label: 'Tổng quan', icon: <LayoutDashboard size={17} />, end: true },
  { to: '/admin/products', label: 'Sản phẩm', icon: <Package size={17} /> },
  { to: '/admin/categories', label: 'Danh mục', icon: <Boxes size={17} /> },
  { to: '/admin/brands', label: 'Thương hiệu', icon: <Tag size={17} /> },
  { to: '/admin/promotions', label: 'Khuyến mãi', icon: <Percent size={17} /> },
  { to: '/admin/inventory', label: 'Tồn kho', icon: <Warehouse size={17} /> },
  { to: '/admin/users', label: 'Người dùng', icon: <Users size={17} /> },
]

export function AdminLayout() {
  const { user } = useAuth()
  // No user yet but a token exists: session still restoring, wait.
  // No user and no token: not logged in, let RequireAdmin redirect to /login.
  if (!user && hasAccessToken()) return <PageLoader />
  return (
    <RequireAdmin>
      <div className="grid min-h-screen bg-paper lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col gap-6 border-b border-ink/20 bg-ink px-5 py-6 text-paper lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
          <div className="flex items-center gap-3">
            <BrandLogo size={34} variant="light" />
            <div>
              <strong className="block text-[14px] font-semibold tracking-[-0.03em]">Ecommerce Admin</strong>
              <small className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/50">
                {user?.role?.name || 'STAFF'}
              </small>
            </div>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1 lg:flex-col" aria-label="Điều hướng quản trị">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-[12px] transition-colors ${
                    isActive ? 'bg-paper/15 text-paper' : 'text-paper/65 hover:bg-paper/10 hover:text-paper'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/"
            className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45 hover:text-paper"
          >
            ← Về cửa hàng
          </NavLink>
        </aside>
        <div className="w-full max-w-[1180px] px-4 py-8 sm:px-8">
          <Outlet />
        </div>
      </div>
    </RequireAdmin>
  )
}
