import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="admin-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="admin-header-action">{action}</div> : null}
    </div>
  )
}

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`admin-card ${className}`}>{children}</div>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="admin-modal-head">
          <h2>{title}</h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  )
}

export function StatusPill({ active }: { active: boolean }) {
  return <span className={`admin-pill ${active ? 'on' : 'off'}`}>{active ? 'Đang bật' : 'Đã tắt'}</span>
}

export function TableEmpty({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-table-empty">
        {text}
      </td>
    </tr>
  )
}
