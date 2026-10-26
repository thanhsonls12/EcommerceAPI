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
  const current = Number(product.basePrice)
  const compareAt = Number(product.virtualPrice)
  if (!current || compareAt <= current) return 0
  return Math.round((1 - current / compareAt) * 100)
}

export const fallbackProductImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720"><rect width="720" height="720" fill="#f1f0eb"/><g fill="none" stroke="#a8a29a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M250 300h220l-22 210H272z"/><path d="M306 300v-34a54 54 0 0 1 108 0v34"/></g><text x="360" y="610" font-family="system-ui,sans-serif" font-size="30" fill="#8d96a4" text-anchor="middle">Ecommerce</text></svg>',
)}`

export function productImage(product?: Pick<Product, 'images'> | null, sku?: Pick<Sku, 'image'> | null) {
  return sku?.image || product?.images?.[0] || fallbackProductImage
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
  return (value || 'E')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
