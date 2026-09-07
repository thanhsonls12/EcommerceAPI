import { SetMetadata } from '@nestjs/common'
import { AUTH_TYPE, AuthType, CONDITION_GUARD, ConditionGuardType } from '../constants/auth.constant'

export const AUTH_TYPE_KEY = 'authType'

export const Auth = (
  authTypes: AuthType[] = [AUTH_TYPE.Bearer],
  options: { condition: ConditionGuardType } = {
    condition: CONDITION_GUARD.And,
  },
) => {
  return SetMetadata(AUTH_TYPE_KEY, { authTypes, options })
}
