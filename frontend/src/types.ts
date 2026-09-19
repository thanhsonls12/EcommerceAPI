export type User = {
  id: number
  name: string
  email: string
  phoneNumber?: string
  avatar?: string | null
  status?: string
}

export type ProductMedia = { id?: number; url: string; type?: string }

export type Category = { id: number; name: string; parentCategoryId?: number | null }

export type Brand = { id: number; name: string; logo?: string | null }

export type ProductVariant = { name: string; options: string[] }

export type Product = {
  id: number
  name: string
  basePrice: string | number
  virtualPrice: string | number
  images?: string[]
  medias?: ProductMedia[]
  highlights?: string[] | null
  specifications?: Record<string, string> | null
  productTranslations?: Array<{ languageId: string; description: string }>
  variants?: ProductVariant[] | null
  brand?: Brand | null
  categories?: Category[]
  createdAt?: string
}

export type Sku = {
  id: number
  value?: Record<string, string>
  price: string | number
  stock: number
  image?: string | null
}

export type CartItem = {
  id?: number
  skuId: number
  quantity: number
  lineTotal?: string | number
  sku?: Sku & { product?: Pick<Product, 'id' | 'name' | 'images'> }
}

export type Cart = { items: CartItem[]; summary: { totalItems: number; totalPrice: string | number } }

export type GuestCartItem = {
  skuId: number
  quantity: number
  sku: Sku
  product: Pick<Product, 'id' | 'name' | 'images'>
}

export type CartMergeResult = {
  cart: Cart
  adjustments: Array<{
    skuId: number
    requested: number
    merged: number
    reason?: 'UNAVAILABLE' | 'STOCK_LIMIT'
  }>
}

export type Address = {
  id: number
  name: string
  phoneNumber: string
  address: string
  note?: string | null
  isDefault: boolean
}

export type OrderItem = {
  id: number
  productId?: number | null
  skuId?: number | null
  productName: string
  skuPrice: string | number
  quantity: number
  image?: string | null
  skuValue?: Record<string, string> | null
}

export type Order = {
  id: number
  status: string
  subtotal: string | number
  discount: string | number
  total: string | number
  receiver?: { name: string; phoneNumber: string; address: string; note?: string }
  items: OrderItem[]
  createdAt?: string
}

export type PaymentStatus = {
  id: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  amount: string | number
  gateway?: string | null
  reference?: string | null
  orderId: number
  orderStatus: string
}

export type Review = {
  id: number
  rating: number
  content: string
  createdAt: string
  user?: { name: string; avatar?: string | null }
  medias?: ProductMedia[]
}

export type Pagination = { page: number; limit: number; total: number; totalPages: number }
export type ProductListResponse = { data: Product[]; pagination: Pagination }
export type ReviewResponse = { data: Review[]; rating: { average: number; count: number }; pagination: Pagination }
