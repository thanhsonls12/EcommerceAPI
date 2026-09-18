import type { ApiEnvelope } from './api-types'

export type { ApiEnvelope }

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export function getAccessToken() {
  return localStorage.getItem('accessToken')
}
export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}
export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem('accessToken', accessToken)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
}
export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}
export function hasAccessToken() {
  return Boolean(getAccessToken())
}

function collectMessages(value: unknown, acc: string[] = []): string[] {
  if (!value) return acc
  if (typeof value === 'string') {
    if (value.trim()) acc.push(value.trim())
    return acc
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectMessages(item, acc))
    return acc
  }
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    if ('message' in object) collectMessages(object.message, acc)
    if ('errors' in object) collectMessages(object.errors, acc)
  }
  return acc
}

function extractFieldErrors(payload: unknown) {
  const result: Record<string, string> = {}
  if (!payload || typeof payload !== 'object') return result
  const object = payload as Record<string, unknown>
  if (Array.isArray(object.message)) {
    object.message.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return
      const item = entry as Record<string, unknown>
      const path = Array.isArray(item.path) ? item.path.join('.') : String(item.path || '')
      if (path && typeof item.message === 'string') result[path] = item.message
    })
  }
  if (object.errors && typeof object.errors === 'object' && !Array.isArray(object.errors)) {
    Object.entries(object.errors as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'string') result[key] = value
      if (Array.isArray(value) && typeof value[0] === 'string') result[key] = value[0]
    })
  }
  return result
}

function messageFor(payload: unknown, status: number) {
  const messages = [...new Set(collectMessages(payload))]
  if (messages.length) return messages.join(' · ')
  if (status === 0) return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy.'
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Không tìm thấy nội dung yêu cầu.'
  if (status === 409) return 'Dữ liệu vừa thay đổi. Vui lòng thử lại.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.'
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  return `Request failed (${status})`
}

let refreshPromise: Promise<boolean> | null = null
async function refreshSession() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false
        const payload = (await response.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
        if (!data?.accessToken) return false
        setTokens(data.accessToken, data.refreshToken)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function api<T>(path: string, options: RequestInit | boolean = {}, auth = true, retry = true): Promise<T> {
  const requestOptions = typeof options === 'boolean' ? {} : options
  const requestAuth = typeof options === 'boolean' ? options : auth
  const headers = new Headers(requestOptions.headers)
  if (requestOptions.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (requestAuth) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...requestOptions, headers })
  } catch {
    throw new ApiError(messageFor(null, 0), 0)
  }
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | Record<string, unknown> | null
  if (response.status === 401 && requestAuth && retry && (await refreshSession()))
    return api<T>(path, requestOptions, true, false)
  if (!response.ok)
    throw new ApiError(messageFor(payload, response.status), response.status, extractFieldErrors(payload))
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as ApiEnvelope<T>).data
  return payload as T
}
