import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, ApiError } from '../api'
import { RequireAuth } from './checkout'
import { AccountNav } from './account'
import { Button, Field } from '../components/ui'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6).max(20),
    confirmNewPassword: z.string().min(6).max(20),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Mật khẩu xác nhận không khớp.',
  })
type PasswordValues = z.infer<typeof passwordSchema>

export function SecurityPage() {
  return (
    <RequireAuth>
      <SecurityContent />
    </RequireAuth>
  )
}

function SecurityContent() {
  return (
    <section className="page-section account-section">
      <AccountNav />
      <div className="section-head">
        <div>
          <span className="eyebrow">SECURITY</span>
          <h1>Bảo mật tài khoản</h1>
          <p>Quản lý mật khẩu và xác thực hai bước.</p>
        </div>
      </div>
      <div className="security-grid">
        <PasswordForm />
        <TwoFactorPanel />
      </div>
    </section>
  )
}

function PasswordForm() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })
  const mutation = useMutation({
    mutationFn: (values: PasswordValues) =>
      api('/users/me/password', { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: () => {
      form.reset()
      setMessage('Mật khẩu đã được cập nhật.')
      setError('')
    },
    onError: (reason: unknown) => {
      setError(reason instanceof ApiError ? reason.message : 'Không thể đổi mật khẩu.')
      setMessage('')
    },
  })
  return (
    <div className="account-form-card">
      <div className="security-card-heading">
        <KeyRound size={20} />
        <div>
          <h2>Đổi mật khẩu</h2>
          <p>Dùng mật khẩu dài và riêng cho tài khoản này.</p>
        </div>
      </div>
      <form className="address-form" onSubmit={form.handleSubmit((values) => void mutation.mutateAsync(values))}>
        <Field label="Mật khẩu hiện tại" error={form.formState.errors.currentPassword?.message}>
          <input type="password" {...form.register('currentPassword')} />
        </Field>
        <Field label="Mật khẩu mới" error={form.formState.errors.newPassword?.message}>
          <input type="password" {...form.register('newPassword')} />
        </Field>
        <Field label="Nhập lại mật khẩu mới" error={form.formState.errors.confirmNewPassword?.message}>
          <input type="password" {...form.register('confirmNewPassword')} />
        </Field>
        {message ? <div className="inline-alert success">{message}</div> : null}
        {error ? <div className="inline-alert error">{error}</div> : null}
        <Button type="submit" loading={mutation.isPending}>
          Cập nhật mật khẩu
        </Button>
      </form>
    </div>
  )
}

function TwoFactorPanel() {
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const setupMutation = useMutation({
    mutationFn: () => api<{ secret: string; otpauthUri: string }>('/auth/2fa/setup', { method: 'POST' }),
    onSuccess: (result) => {
      setSetup(result)
      setMessage('Quét URI này bằng ứng dụng xác thực, sau đó nhập mã OTP để bật 2FA.')
      setError('')
    },
    onError: (reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không thể khởi tạo 2FA.'),
  })
  const enableMutation = useMutation({
    mutationFn: () =>
      api<{ recoveryCodes: string[] }>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
    onSuccess: (result) => {
      setRecoveryCodes(result.recoveryCodes)
      setMessage('2FA đã được bật. Hãy lưu recovery code ở nơi an toàn.')
      setError('')
    },
    onError: (reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Mã OTP không hợp lệ.'),
  })
  const disableMutation = useMutation({
    mutationFn: () => api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password, code }) }),
    onSuccess: () => {
      setSetup(null)
      setMessage('2FA đã được tắt.')
      setError('')
    },
    onError: (reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không thể tắt 2FA.'),
  })
  return (
    <div className="account-form-card">
      <div className="security-card-heading">
        <ShieldCheck size={20} />
        <div>
          <h2>Xác thực hai bước</h2>
          <p>Thêm một lớp bảo vệ khi đăng nhập.</p>
        </div>
      </div>
      {message ? <div className="inline-alert success">{message}</div> : null}
      {error ? <div className="inline-alert error">{error}</div> : null}
      {!setup && !recoveryCodes.length ? (
        <Button loading={setupMutation.isPending} onClick={() => void setupMutation.mutateAsync()}>
          Thiết lập 2FA
        </Button>
      ) : null}
      {setup ? (
        <div className="two-factor-setup">
          <label>URI thiết lập</label>
          <code>{setup.otpauthUri}</code>
          <Field label="Mã OTP 6 số">
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} />
          </Field>
          <Button
            loading={enableMutation.isPending}
            disabled={code.length !== 6}
            onClick={() => void enableMutation.mutateAsync()}
          >
            Bật 2FA
          </Button>
        </div>
      ) : null}
      {recoveryCodes.length ? (
        <div className="recovery-codes">
          <strong>Recovery codes</strong>
          <div>
            {recoveryCodes.map((value) => (
              <code key={value}>{value}</code>
            ))}
          </div>
          <Field label="Mật khẩu để tắt 2FA">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button
            variant="danger"
            loading={disableMutation.isPending}
            onClick={() => void disableMutation.mutateAsync()}
          >
            Tắt 2FA
          </Button>
        </div>
      ) : null}
    </div>
  )
}
