import { createContext, useContext } from 'react'
import type { Cart, GuestCartItem, Product, Sku, User } from './types'

export type Notice = { kind: 'success' | 'error' | 'info'; text: string }
export type AuthContextValue = {
  user: User | null
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
}
export type CommerceContextValue = {
  user: User | null
  cart: Cart | null
  guestCart: GuestCartItem[]
  addToCart: (sku: Sku, product: Product, quantity?: number) => Promise<void>
  updateCart: (skuId: number, quantity: number) => Promise<void>
  removeFromCart: (skuId: number) => Promise<void>
  refreshCart: () => Promise<void>
  cartCount: number
}

export const AuthContext = createContext<AuthContextValue | null>(null)
export const CommerceContext = createContext<CommerceContextValue | null>(null)
export const guestCartKey = 'ecommerce-guest-cart'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthContext missing')
  return value
}
export function useCommerce() {
  const value = useContext(CommerceContext)
  if (!value) throw new Error('CommerceContext missing')
  return value
}
export function readGuestCart(): GuestCartItem[] {
  try {
    return JSON.parse(localStorage.getItem(guestCartKey) || '[]') as GuestCartItem[]
  } catch {
    return []
  }
}
export function saveGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(guestCartKey, JSON.stringify(items))
}
