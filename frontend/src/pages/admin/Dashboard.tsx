import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Package, Percent, Users } from 'lucide-react'
import { api } from '../../api'
import { money } from '../../lib'
import { AdminCard, AdminHeader } from './admin-ui'
import { PageLoader } from '../../components/ui'
import type { AdminUserListResponse, LowStockSku, ProductListResponse, Promotion } from '../../types'

export function AdminDashboard() {
  const products = useQuery({
    queryKey: ['admin', 'products', 'count'],
    queryFn: () => api<ProductListResponse>('/products?page=1&limit=1'),
  })
  const users = useQuery({
    queryKey: ['admin', 'users', 'count'],
    queryFn: () => api<AdminUserListResponse>('/users?page=1&limit=1'),
  })
  const promotions = useQuery({ queryKey: ['admin', 'promotions'], queryFn: () => api<Promotion[]>('/promotions') })
  const lowStock = useQuery({
    queryKey: ['admin', 'low-stock'],
    queryFn: () => api<LowStockSku[]>('/inventory/low-stock?threshold=10'),
  })

  if (products.isLoading || users.isLoading || promotions.isLoading || lowStock.isLoading) return <PageLoader />

  const activePromotions = (promotions.data || []).filter((promotion) => promotion.isActive).length

  const stats = [
    {
      label: 'Sản phẩm',
      value: products.data?.pagination.total ?? 0,
      icon: <Package size={20} />,
      to: '/admin/products',
    },
    { label: 'Người dùng', value: users.data?.pagination.total ?? 0, icon: <Users size={20} />, to: '/admin/users' },
    { label: 'Khuyến mãi đang bật', value: activePromotions, icon: <Percent size={20} />, to: '/admin/promotions' },
    {
      label: 'SKU sắp hết hàng',
      value: lowStock.data?.length ?? 0,
      icon: <AlertTriangle size={20} />,
      to: '/admin/inventory',
    },
  ]

  return (
    <>
      <AdminHeader title="Tổng quan" subtitle="Nhìn nhanh tình hình cửa hàng." />
      <div className="admin-stat-grid">
        {stats.map((stat) => (
          <Link to={stat.to} className="admin-stat" key={stat.label}>
            <span className="admin-stat-icon">{stat.icon}</span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </Link>
        ))}
      </div>
      <AdminCard>
        <div className="admin-card-head">
          <h2>SKU sắp hết hàng</h2>
          <Link to="/admin/inventory" className="text-link">
            Quản lý tồn kho
          </Link>
        </div>
        {lowStock.data?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>Giá</th>
                <th className="ta-right">Tồn</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.data.slice(0, 8).map((sku) => (
                <tr key={sku.id}>
                  <td>{sku.product?.name || `#${sku.id}`}</td>
                  <td>{sku.value ? Object.values(sku.value).join(' · ') : '—'}</td>
                  <td>{money(sku.price)}</td>
                  <td className="ta-right">
                    <span className={`admin-stock ${sku.stock === 0 ? 'zero' : 'low'}`}>{sku.stock}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-muted">Không có SKU nào dưới ngưỡng tồn kho.</p>
        )}
      </AdminCard>
    </>
  )
}
