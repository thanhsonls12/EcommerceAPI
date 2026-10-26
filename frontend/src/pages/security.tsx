import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, ApiError } from '../api'
import { AccountNav } from './account'
import { Alert, Button, Field, Input } from '../components/ui'

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
    <section className="page-shell py-8 pb-24 sm:py-10">
      <AccountNav />
      <div className="mt-8 border-b border-line pb-6">
        <span className="label-mono">Security</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Bảo mật tài khoản</h1>
        <p className="mt-1 text-[13px] text-muted">Quản lý mật khẩu và xác thực hai bước.</p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
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
    <div className="border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <KeyRound size={18} className="mt-0.5 text-accent" />
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Đổi mật khẩu</h2>
          <p className="mt-0.5 text-[11px] text-muted">Dùng mật khẩu dài và riêng cho tài khoản này.</p>
        </div>
      </div>
      <form className="grid gap-4 p-5" onSubmit={form.handleSubmit((values) => void mutation.mutateAsync(values))}>
        <Field label="Mật khẩu hiện tại" error={form.formState.errors.currentPassword?.message}>
          <Input type="password" {...form.register('currentPassword')} />
        </Field>
        <Field label="Mật khẩu mới" error={form.formState.errors.newPassword?.message}>
          <Input type="password" {...form.register('newPassword')} />
        </Field>
        <Field label="Nhập lại mật khẩu mới" error={form.formState.errors.confirmNewPassword?.message}>
          <Input type="password" {...form.register('confirmNewPassword')} />
        </Field>
        {message ? <Alert variant="success">{message}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Button type="submit" loading={mutation.isPending} className="justify-self-start">
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
    <div className="border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <ShieldCheck size={18} className="mt-0.5 text-accent" />
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Xác thực hai bước</h2>
          <p className="mt-0.5 text-[11px] text-muted">Thêm một lớp bảo vệ khi đăng nhập.</p>
        </div>
      </div>
      <div className="grid gap-4 p-5">
        {message ? <Alert variant="success">{message}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {!setup && !recoveryCodes.length ? (
          <Button
            loading={setupMutation.isPending}
            onClick={() => void setupMutation.mutateAsync()}
            className="justify-self-start"
          >
            Thiết lập 2FA
          </Button>
        ) : null}
        {setup ? (
          <div className="grid gap-3">
            <span className="label-mono">URI thiết lập</span>
            <code className="break-all border border-line bg-paper p-3 font-mono text-[10px] leading-relaxed text-ink-soft">
              {setup.otpauthUri}
            </code>
            <Field label="Mã OTP 6 số">
              <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} />
            </Field>
            <Button
              loading={enableMutation.isPending}
              disabled={code.length !== 6}
              onClick={() => void enableMutation.mutateAsync()}
              className="justify-self-start"
            >
              Bật 2FA
            </Button>
          </div>
        ) : null}
        {recoveryCodes.length ? (
          <div className="grid gap-3">
            <span className="label-mono">Recovery codes</span>
            <div className="grid grid-cols-2 gap-1.5">
              {recoveryCodes.map((value) => (
                <code key={value} className="border border-line bg-paper px-2 py-1.5 text-center font-mono text-[11px]">
                  {value}
                </code>
              ))}
            </div>
            <Field label="Mật khẩu để tắt 2FA">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Button
              variant="danger"
              loading={disableMutation.isPending}
              onClick={() => void disableMutation.mutateAsync()}
              className="justify-self-start"
            >
              Tắt 2FA
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
