import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../../api'
import { useAuth } from '../../app-context'
import { Alert, Button, Field, Input } from '../../components/ui'
import { BrandLogo } from '../../components/BrandLogo'
import type { User } from '../../types'

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'twoFactor'

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requestedRedirect = params.get('redirect') || '/'
  const redirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : '/'
  const [currentMode, setCurrentMode] = useState(mode)
  const [values, setValues] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const twoFactorToken = sessionStorage.getItem('twoFactorToken') || ''
  const mutation = useMutation({
    mutationFn: async () => {
      if (currentMode === 'login')
        return api<{
          requiresTwoFactor: boolean
          accessToken?: string
          refreshToken?: string
          twoFactorToken?: string
          user?: User
        }>(
          '/auth/login',
          { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) },
          false,
        )
      if (currentMode === 'register')
        return api(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              confirmPassword: values.confirmPassword,
              name: values.name,
              phoneNumber: values.phoneNumber,
            }),
          },
          false,
        )
      if (currentMode === 'verify')
        return api(
          '/auth/verify-email',
          { method: 'POST', body: JSON.stringify({ email: values.email, code: values.code }) },
          false,
        )
      if (currentMode === 'twoFactor')
        return api<{ requiresTwoFactor: boolean; accessToken?: string; refreshToken?: string; user?: User }>(
          '/auth/2fa/verify-login',
          { method: 'POST', body: JSON.stringify({ twoFactorToken, code: values.code }) },
          false,
        )
      if (currentMode === 'reset')
        return api(
          '/auth/reset-password',
          {
            method: 'POST',
            body: JSON.stringify({
              email: values.email,
              code: values.code,
              password: values.password,
              confirmPassword: values.confirmPassword,
            }),
          },
          false,
        )
      return api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: values.email }) }, false)
    },
    onSuccess: (result) => {
      if (currentMode === 'login' || currentMode === 'twoFactor') {
        const data = result as { requiresTwoFactor: boolean; accessToken?: string; refreshToken?: string; user?: User }
        if (data.requiresTwoFactor) {
          sessionStorage.setItem('twoFactorToken', (result as { twoFactorToken?: string }).twoFactorToken || '')
          setCurrentMode('twoFactor')
          setMessage('Nhập mã OTP 6 số từ ứng dụng xác thực.')
          return
        }
        if (!data.accessToken || !data.refreshToken || !data.user) {
          setError('Đăng nhập chưa trả về đủ thông tin phiên.')
          return
        }
        login(data.user, data.accessToken, data.refreshToken)
        sessionStorage.removeItem('twoFactorToken')
        navigate(redirect, { replace: true })
      } else if (currentMode === 'register') {
        setMessage('Đăng ký thành công. Kiểm tra email để lấy mã xác thực.')
        setCurrentMode('verify')
      } else if (currentMode === 'verify') {
        setMessage('Email đã được xác thực. Bạn có thể đăng nhập.')
        setCurrentMode('login')
      } else if (currentMode === 'forgot') {
        setMessage('Nếu email tồn tại, mã khôi phục sẽ được gửi tới bạn.')
        setCurrentMode('reset')
      } else if (currentMode === 'reset') {
        setMessage('Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.')
        setCurrentMode('login')
      }
    },
    onError: (reason: unknown) =>
      setError(reason instanceof ApiError ? reason.message : 'Có lỗi xảy ra. Vui lòng thử lại.'),
  })
  if (user) return <Navigate to={redirect} replace />
  const title =
    currentMode === 'login'
      ? 'Chào mừng bạn trở lại'
      : currentMode === 'register'
        ? 'Tạo tài khoản Ecommerce'
        : currentMode === 'verify'
          ? 'Xác thực email'
          : currentMode === 'twoFactor'
            ? 'Xác thực hai bước'
            : currentMode === 'reset'
              ? 'Đặt lại mật khẩu'
              : 'Lấy lại mật khẩu'
  const subtitle =
    currentMode === 'login'
      ? 'Đăng nhập để theo dõi đơn hàng và checkout nhanh hơn.'
      : currentMode === 'register'
        ? 'Tạo tài khoản miễn phí để bắt đầu mua sắm.'
        : currentMode === 'verify'
          ? `Mã xác thực đã được gửi tới ${values.email || 'email của bạn'}.`
          : currentMode === 'twoFactor'
            ? 'Nhập mã OTP từ ứng dụng xác thực để tiếp tục.'
            : currentMode === 'reset'
              ? 'Nhập mã trong email và mật khẩu mới của bạn.'
              : 'Nhập email để nhận hướng dẫn khôi phục.'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    void mutation.mutateAsync()
  }
  return (
    <section className="grid lg:min-h-[calc(100vh-6.25rem)] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-paper lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={30} variant="light" />
          <span className="text-[15px] font-semibold tracking-[-0.045em]">Ecommerce</span>
        </Link>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">A smaller way to shop</span>
          <h1 className="mt-5 max-w-md text-5xl font-semibold leading-[0.98] tracking-[-0.055em]">
            Chọn ít hơn.
            <br />
            <span className="text-accent">Chọn đúng hơn.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-paper/60">
            Một cửa hàng điện tử được tuyển chọn cho những điều bạn thực sự muốn dùng mỗi ngày.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/35">
          Made for everyday rituals
        </span>
      </div>

      <div className="flex items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandLogo size={30} />
            <span className="text-[15px] font-semibold tracking-[-0.045em]">Ecommerce</span>
          </Link>
          <span className="label-mono">Your account</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{subtitle}</p>

          {message ? (
            <Alert variant="success" className="mt-5">
              {message}
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="error" className="mt-5">
              {error}
            </Alert>
          ) : null}

          <form onSubmit={submit} className="mt-6 grid gap-4">
            {currentMode === 'register' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Họ và tên">
                  <Input
                    value={values.name}
                    onChange={(event) => setValues({ ...values, name: event.target.value })}
                    required
                    autoComplete="name"
                  />
                </Field>
                <Field label="Số điện thoại">
                  <Input
                    value={values.phoneNumber}
                    onChange={(event) => setValues({ ...values, phoneNumber: event.target.value })}
                    required
                    inputMode="tel"
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Email">
              <Input
                type="email"
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
                required
                autoComplete="email"
              />
            </Field>
            {currentMode === 'verify' || currentMode === 'twoFactor' || currentMode === 'reset' ? (
              <Field label={currentMode === 'twoFactor' ? 'Mã OTP 6 số' : 'Mã xác thực 6 số'}>
                <Input
                  value={values.code}
                  onChange={(event) => setValues({ ...values, code: event.target.value })}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  className="font-mono tracking-[0.2em]"
                />
              </Field>
            ) : null}
            {currentMode === 'login' || currentMode === 'register' || currentMode === 'reset' ? (
              <Field label="Mật khẩu">
                <Input
                  type="password"
                  value={values.password}
                  onChange={(event) => setValues({ ...values, password: event.target.value })}
                  required
                  minLength={6}
                  autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'}
                />
              </Field>
            ) : null}
            {currentMode === 'register' || currentMode === 'reset' ? (
              <Field label="Nhập lại mật khẩu">
                <Input
                  type="password"
                  value={values.confirmPassword}
                  onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </Field>
            ) : null}
            <Button type="submit" size="lg" className="mt-1 w-full" loading={mutation.isPending}>
              {currentMode === 'login'
                ? 'Đăng nhập'
                : currentMode === 'register'
                  ? 'Tạo tài khoản'
                  : currentMode === 'verify'
                    ? 'Xác thực email'
                    : currentMode === 'twoFactor'
                      ? 'Xác nhận OTP'
                      : currentMode === 'reset'
                        ? 'Đặt lại mật khẩu'
                        : 'Gửi mã khôi phục'}
              <ArrowUpRight size={16} />
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.1em]">
            {currentMode === 'login' ? (
              <>
                <Link to="/register" className="text-accent hover:text-ink">
                  Tạo tài khoản mới
                </Link>
                <Link to="/forgot-password" className="text-muted hover:text-ink">
                  Quên mật khẩu?
                </Link>
              </>
            ) : (
              <Link to="/login" className="text-accent hover:text-ink">
                Quay lại đăng nhập
              </Link>
            )}
            {currentMode === 'verify' ? (
              <button
                type="button"
                className="text-muted hover:text-ink"
                onClick={() => {
                  setError('')
                  void api(
                    '/auth/resend-verification-code',
                    { method: 'POST', body: JSON.stringify({ email: values.email }) },
                    false,
                  )
                    .then(() => setMessage('Đã gửi lại mã xác thực.'))
                    .catch((reason: unknown) =>
                      setError(reason instanceof ApiError ? reason.message : 'Không thể gửi lại mã.'),
                    )
                }}
              >
                Gửi lại mã
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
