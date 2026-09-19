import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { date, initials } from '../../lib'
import { Button, EmptyState, ErrorState, PageLoader } from '../../components/ui'
import { AdminCard, AdminHeader } from './admin-ui'
import type { AdminUserListResponse } from '../../types'

export function AdminUsers() {
  const [page, setPage] = useState(1)
  const users = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => api<AdminUserListResponse>(`/users?page=${page}&limit=20`),
  })

  if (users.isLoading) return <PageLoader />
  if (users.isError) return <ErrorState onRetry={() => void users.refetch()} />

  const list = users.data?.data || []
  const pagination = users.data?.pagination

  return (
    <>
      <AdminHeader title="Người dùng" subtitle="Danh sách tài khoản trong hệ thống." />
      <AdminCard>
        {list.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-avatar">{initials(user.name)}</span>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber || '—'}</td>
                  <td>
                    <span className={`admin-status admin-status-${user.status.toLowerCase()}`}>{user.status}</span>
                  </td>
                  <td>{date(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Chưa có người dùng" text="Danh sách trống." />
        )}
        {pagination && pagination.totalPages > 1 ? (
          <div className="admin-pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Trước
            </Button>
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </AdminCard>
    </>
  )
}
