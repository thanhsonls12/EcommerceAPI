import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../../api'
import { useAuth } from '../../app-context'
import { Button, Field } from '../../components/ui'
import type { User } from '../../types'

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'twoFactor'
export function AuthPage({ mode }: { mode: AuthMode }) {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/'
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
  if (user) return <Navigate to="/" replace />
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
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    void mutation.mutateAsync()
  }
  return (
    <section className="auth-page">
      <div className="auth-panel">
        <div className="auth-art">
          <Link to="/" className="logo logo-light">
            <span className="logo-mark">E</span>
            <span>
              <strong>Ecommerce</strong>
              <small>electronics, simply</small>
            </span>
          </Link>
          <div>
            <span className="eyebrow">A SMALLER WAY TO SHOP</span>
            <h1>
              Chọn ít hơn.
              <br />
              <em>Chọn đúng hơn.</em>
            </h1>
            <p>Một cửa hàng điện tử được tuyển chọn cho những điều bạn thực sự muốn dùng mỗi ngày.</p>
          </div>
          <span className="auth-art-note">Made for everyday rituals.</span>
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-head">
            <span className="eyebrow">YOUR ACCOUNT</span>
            <h1>{title}</h1>
            <p>
              {currentMode === 'login'
                ? 'Đăng nhập để theo dõi đơn hàng và checkout nhanh hơn.'
                : currentMode === 'register'
                  ? 'Tạo tài khoản miễn phí để bắt đầu mua sắm.'
                  : currentMode === 'verify'
                    ? `Mã xác thực đã được gửi tới ${values.email || 'email của bạn'}.`
                    : currentMode === 'twoFactor'
                      ? 'Nhập mã OTP từ ứng dụng xác thực để tiếp tục.'
                      : currentMode === 'reset'
                        ? 'Nhập mã trong email và mật khẩu mới của bạn.'
                        : 'Nhập email để nhận hướng dẫn khôi phục.'}
            </p>
          </div>
          {message ? <div className="inline-alert success">{message}</div> : null}
          {error ? <div className="inline-alert error">{error}</div> : null}
          <form onSubmit={submit} className="auth-form">
            <div className="auth-fields">
              {currentMode === 'register' ? (
                <>
                  <Field label="Họ và tên">
                    <input
                      value={values.name}
                      onChange={(event) => setValues({ ...values, name: event.target.value })}
                      required
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Số điện thoại">
                    <input
                      value={values.phoneNumber}
                      onChange={(event) => setValues({ ...values, phoneNumber: event.target.value })}
                      required
                      inputMode="tel"
                    />
                  </Field>
                </>
              ) : null}
              <Field label="Email">
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => setValues({ ...values, email: event.target.value })}
                  required
                  autoComplete="email"
                />
              </Field>
              {currentMode === 'verify' || currentMode === 'twoFactor' || currentMode === 'reset' ? (
                <Field label={currentMode === 'twoFactor' ? 'Mã OTP 6 số' : 'Mã xác thực 6 số'}>
                  <input
                    value={values.code}
                    onChange={(event) => setValues({ ...values, code: event.target.value })}
                    required
                    inputMode="numeric"
                    maxLength={6}
                  />
                </Field>
              ) : null}
              {currentMode === 'login' || currentMode === 'register' || currentMode === 'reset' ? (
                <Field label="Mật khẩu">
                  <input
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
                  <input
                    type="password"
                    value={values.confirmPassword}
                    onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </Field>
              ) : null}
            </div>
            <Button type="submit" className="full-button" loading={mutation.isPending}>
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
                        : 'Gửi mã khôi phục'}{' '}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="auth-links">
            {currentMode === 'login' ? (
              <>
                <Link to="/register">Tạo tài khoản mới</Link>
                <Link to="/forgot-password">Quên mật khẩu?</Link>
              </>
            ) : (
              <Link to="/login" className="text-link">
                Quay lại đăng nhập
              </Link>
            )}
            {currentMode === 'verify' ? (
              <button
                className="text-link"
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
