import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import { api, clearTokens, getAccessToken, getRefreshToken, SESSION_EXPIRED_EVENT, setTokens } from './api'
import { AuthContext, CommerceContext, readGuestCart, saveGuestCart } from './app-context'
import type { CommerceContextValue, Notice } from './app-context'
import { StoreLayout } from './components/layout'
import { PageLoader } from './components/ui'
import { AuthPage } from './features/auth/AuthPage'
import { CheckoutPage } from './pages/checkout'
import { AccountPage, AddressesPage, OrderDetailPage, OrdersPage } from './pages/account'
import { HomePage, ProductDetailPage, ProductsPage, CartPage } from './pages/storefront'
import { NotFoundPage, PaymentPage } from './pages/misc'
import { SecurityPage } from './pages/security'
import type { Cart, GuestCartItem, Product, Sku, User } from './types'

function App() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('ecommerce-user') || 'null') as User | null
    } catch {
      return null
    }
  })
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>(readGuestCart)
  const [notice, setNotice] = useState<Notice | null>(null)
  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: () => api<Cart>('/cart'), enabled: Boolean(user) })
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/users/me'),
    enabled: Boolean(getAccessToken()),
    retry: false,
  })
  useEffect(() => {
    if (meQuery.data) {
      // Query restore synchronizes persisted auth with provider state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(meQuery.data)
      localStorage.setItem('ecommerce-user', JSON.stringify(meQuery.data))
    }
  }, [meQuery.data])
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      queryClient.removeQueries({ queryKey: ['me'] })
      queryClient.removeQueries({ queryKey: ['cart'] })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [queryClient])
  useEffect(() => {
    saveGuestCart(guestCart)
  }, [guestCart])
  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(null), 4200)
      return () => window.clearTimeout(timer)
    }
  }, [notice])
  const login = useCallback(
    (nextUser: User, accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken)
      setUser(nextUser)
      localStorage.setItem('ecommerce-user', JSON.stringify(nextUser))
      if (guestCart.length)
        void Promise.all(
          guestCart.map((item) =>
            api('/cart/items', {
              method: 'POST',
              body: JSON.stringify({ skuId: item.skuId, quantity: item.quantity }),
            }),
          ),
        ).then(() => {
          setGuestCart([])
          void queryClient.invalidateQueries({ queryKey: ['cart'] })
        })
    },
    [guestCart, queryClient],
  )
  const logout = useCallback(() => {
    const refreshToken = getRefreshToken()
    if (refreshToken)
      void api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false).catch(() => undefined)
    clearTokens()
    localStorage.removeItem('ecommerce-user')
    setUser(null)
    queryClient.removeQueries({ queryKey: ['cart'] })
  }, [queryClient])
  const addToCart = useCallback(
    async (sku: Sku, product: Product, quantity = 1) => {
      if (user) {
        await api('/cart/items', { method: 'POST', body: JSON.stringify({ skuId: sku.id, quantity }) })
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
        setNotice({ kind: 'success', text: 'Đã thêm sản phẩm vào giỏ hàng.' })
        return
      }
      setGuestCart((current) => {
        const existing = current.find((item) => item.skuId === sku.id)
        if (existing)
          return current.map((item) =>
            item.skuId === sku.id ? { ...item, quantity: Math.min(item.quantity + quantity, 99) } : item,
          )
        return [
          ...current,
          { skuId: sku.id, quantity, sku, product: { id: product.id, name: product.name, images: product.images } },
        ]
      })
      setNotice({ kind: 'success', text: 'Đã thêm sản phẩm vào giỏ hàng.' })
    },
    [queryClient, user],
  )
  const updateCart = useCallback(
    async (skuId: number, quantity: number) => {
      if (quantity < 1) return
      if (user) {
        await api(`/cart/items/${skuId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
      } else setGuestCart((current) => current.map((item) => (item.skuId === skuId ? { ...item, quantity } : item)))
    },
    [queryClient, user],
  )
  const removeFromCart = useCallback(
    async (skuId: number) => {
      if (user) {
        await api(`/cart/items/${skuId}`, { method: 'DELETE' })
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
      } else setGuestCart((current) => current.filter((item) => item.skuId !== skuId))
    },
    [queryClient, user],
  )
  const refreshCart = useCallback(async () => {
    if (user) await queryClient.invalidateQueries({ queryKey: ['cart'] })
  }, [queryClient, user])
  const cartItems = user ? cartQuery.data?.items || [] : guestCart
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const commerce = useMemo<CommerceContextValue>(
    () => ({
      user,
      cart: cartQuery.data || null,
      guestCart,
      addToCart,
      updateCart,
      removeFromCart,
      refreshCart,
      cartCount,
    }),
    [addToCart, cartCount, cartQuery.data, guestCart, refreshCart, removeFromCart, updateCart, user],
  )
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <CommerceContext.Provider value={commerce}>
        <StoreLayout notice={notice} clearNotice={() => setNotice(null)}>
          {meQuery.isLoading ? <PageLoader /> : <AppRoutes />}
        </StoreLayout>
      </CommerceContext.Provider>
    </AuthContext.Provider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment/:state" element={<PaymentPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/verify-email" element={<AuthPage mode="verify" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/account/orders" element={<OrdersPage />} />
      <Route path="/account/orders/:id" element={<OrderDetailPage />} />
      <Route path="/account/addresses" element={<AddressesPage />} />
      <Route path="/account/security" element={<SecurityPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
