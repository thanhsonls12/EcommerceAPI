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
  { to: '/admin', label: 'Tổng quan', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/admin/products', label: 'Sản phẩm', icon: <Package size={18} /> },
  { to: '/admin/categories', label: 'Danh mục', icon: <Boxes size={18} /> },
  { to: '/admin/brands', label: 'Thương hiệu', icon: <Tag size={18} /> },
  { to: '/admin/promotions', label: 'Khuyến mãi', icon: <Percent size={18} /> },
  { to: '/admin/inventory', label: 'Tồn kho', icon: <Warehouse size={18} /> },
  { to: '/admin/users', label: 'Người dùng', icon: <Users size={18} /> },
]

export function AdminLayout() {
  const { user } = useAuth()
  // No user yet but a token exists: session still restoring, wait.
  // No user and no token: not logged in, let RequireAdmin redirect to /login.
  if (!user && hasAccessToken()) return <PageLoader />
  return (
    <RequireAdmin>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand flex items-center gap-3">
            <BrandLogo size={36} />
            <div>
              <strong>Ecommerce Admin</strong>
              <small>{user?.role?.name || 'STAFF'}</small>
            </div>
          </div>
          <nav className="admin-nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className="admin-nav-link">
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
          <NavLink to="/" className="admin-back">
            ← Về cửa hàng
          </NavLink>
        </aside>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </RequireAdmin>
  )
}
