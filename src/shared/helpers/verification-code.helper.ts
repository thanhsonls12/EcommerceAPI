import { createHmac } from 'node:crypto'
import envConfig from '../config'

export function hashVerificationCode(code: string) {
  return createHmac('sha256', envConfig.VERIFICATION_CODE_SECRET).update(code).digest('hex')
}
