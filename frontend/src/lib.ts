import type { Product, Sku } from './types'

export function money(value: unknown) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(numeric)
    : String(value ?? '')
}

export function date(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
}

export function discountPercent(product: Product) {
  const base = Number(product.basePrice)
  const sale = Number(product.virtualPrice)
  if (!base || sale >= base) return 0
  return Math.round((1 - sale / base) * 100)
}

export function productImage(product?: Pick<Product, 'images'> | null, sku?: Pick<Sku, 'image'> | null) {
  return sku?.image || product?.images?.[0] || 'https://placehold.co/720x720/f4f1eb/1d2433?text=E'
}

export function skuLabel(sku?: Pick<Sku, 'value'> | null) {
  return sku?.value ? Object.values(sku.value).join(' · ') : 'Phiên bản tiêu chuẩn'
}

export function listFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as { data: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

export function initials(value?: string) {
  return (value || 'E').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
