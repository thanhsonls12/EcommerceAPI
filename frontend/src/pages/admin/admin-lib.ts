import { ApiError } from '../../api'

export function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback
}
