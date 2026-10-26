import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { api, clearTokens, getAccessToken, getRefreshToken, SESSION_EXPIRED_EVENT, setTokens } from './api'
import { AuthContext, CommerceContext, readGuestCart, saveGuestCart } from './app-context'
import type { CommerceContextValue } from './app-context'
import { StoreLayout } from './components/layout'
import { RequireAuth } from './components/RequireAuth'
import { PageLoader } from './components/ui'
import { HomePage, ProductDetailPage, ProductsPage, CartPage } from './pages/storefront'
import type { Cart, CartMergeResult, GuestCartItem, Product, Sku, User } from './types'

const AuthPage = lazy(() => import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })))
const CheckoutPage = lazy(() => import('./pages/checkout').then((module) => ({ default: module.CheckoutPage })))
const AccountPage = lazy(() => import('./pages/account').then((module) => ({ default: module.AccountPage })))
const OrdersPage = lazy(() => import('./pages/account').then((module) => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/account').then((module) => ({ default: module.OrderDetailPage })))
const AddressesPage = lazy(() => import('./pages/account').then((module) => ({ default: module.AddressesPage })))
const PaymentPage = lazy(() => import('./pages/misc').then((module) => ({ default: module.PaymentPage })))
const NotFoundPage = lazy(() => import('./pages/misc').then((module) => ({ default: module.NotFoundPage })))
const SecurityPage = lazy(() => import('./pages/security').then((module) => ({ default: module.SecurityPage })))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminDashboard = lazy(() =>
  import('./pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboard })),
)
const AdminProducts = lazy(() => import('./pages/admin/Products').then((module) => ({ default: module.AdminProducts })))
const AdminCategories = lazy(() =>
  import('./pages/admin/Taxonomy').then((module) => ({ default: module.AdminCategories })),
)
const AdminBrands = lazy(() => import('./pages/admin/Taxonomy').then((module) => ({ default: module.AdminBrands })))
const AdminPromotions = lazy(() =>
  import('./pages/admin/Promotions').then((module) => ({ default: module.AdminPromotions })),
)
const AdminInventory = lazy(() =>
  import('./pages/admin/Inventory').then((module) => ({ default: module.AdminInventory })),
)
const AdminUsers = lazy(() => import('./pages/admin/Users').then((module) => ({ default: module.AdminUsers })))

function App() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const isAdminArea = location.pathname.startsWith('/admin')
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('ecommerce-user') || 'null') as User | null
    } catch {
      return null
    }
  })
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>(readGuestCart)
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
  const login = useCallback(
    (nextUser: User, accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken)
      setUser(nextUser)
      localStorage.setItem('ecommerce-user', JSON.stringify(nextUser))
      if (guestCart.length) {
        void api<CartMergeResult>('/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ items: guestCart.map(({ skuId, quantity }) => ({ skuId, quantity })) }),
        })
          .then((result) => {
            setGuestCart([])
            queryClient.setQueryData(['cart'], result.cart)
            const unavailable = result.adjustments.filter((item) => item.reason === 'UNAVAILABLE').length
            const limited = result.adjustments.filter((item) => item.reason === 'STOCK_LIMIT').length
            if (unavailable || limited) {
              toast.info(
                `Giỏ hàng đã được đồng bộ${unavailable ? `; ${unavailable} sản phẩm không còn khả dụng` : ''}${limited ? `; ${limited} sản phẩm được điều chỉnh theo tồn kho` : ''}.`,
              )
            }
          })
          .catch(() => {
            toast.error('Chưa thể đồng bộ giỏ hàng khách. Giỏ cũ vẫn được giữ để thử lại.')
          })
      }
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
        toast.success('Đã thêm sản phẩm vào giỏ hàng.')
        return
      }
      setGuestCart((current) => {
        const available = Math.max(1, Math.min(sku.stock, 99))
        const existing = current.find((item) => item.skuId === sku.id)
        if (existing)
          return current.map((item) =>
            item.skuId === sku.id ? { ...item, quantity: Math.min(item.quantity + quantity, available) } : item,
          )
        return [
          ...current,
          {
            skuId: sku.id,
            quantity: Math.min(quantity, available),
            sku,
            product: { id: product.id, name: product.name, images: product.images },
          },
        ]
      })
      toast.success('Đã thêm sản phẩm vào giỏ hàng.')
    },
    [queryClient, user],
  )
  const updateCart = useCallback(
    async (skuId: number, quantity: number) => {
      if (quantity < 1) return
      if (user) {
        await api(`/cart/items/${skuId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
      } else
        setGuestCart((current) =>
          current.map((item) =>
            item.skuId === skuId
              ? { ...item, quantity: Math.min(quantity, Math.max(1, Math.min(item.sku.stock, 99))) }
              : item,
          ),
        )
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
  const sessionRestoring = Boolean(getAccessToken()) && !user && meQuery.isLoading
  const routes = sessionRestoring ? <PageLoader /> : <AppRoutes />
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <CommerceContext.Provider value={commerce}>
        {isAdminArea ? routes : <StoreLayout>{routes}</StoreLayout>}
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: 'rounded-sm! border! border-line! bg-surface! font-sans! text-ink! shadow-lift!',
              title: 'text-[12px]! font-medium!',
              description: 'text-[11px]! text-muted!',
              closeButton: 'border-line! bg-surface! text-muted!',
            },
          }}
        />
      </CommerceContext.Provider>
    </AuthContext.Provider>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/:state" element={<PaymentPage />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/register" element={<AuthPage key="register" mode="register" />} />
        <Route path="/verify-email" element={<AuthPage key="verify" mode="verify" />} />
        <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
        <Route path="/reset-password" element={<AuthPage key="reset" mode="reset" />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account/orders/:id"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account/addresses"
          element={
            <RequireAuth>
              <AddressesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account/security"
          element={
            <RequireAuth>
              <SecurityPage />
            </RequireAuth>
          }
        />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="brands" element={<AdminBrands />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
