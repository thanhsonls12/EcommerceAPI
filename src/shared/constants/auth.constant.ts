export const REQUEST_USER_KEY = 'user'
export const AUTH_TYPE = {
  Bearer: 'Bearer',
  None: 'None',
  ApiKey: 'ApiKey',
} as const

export type AuthType = (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE]

export const CONDITION_GUARD = {
  And: 'and',
  Or: 'or',
} as const

export type ConditionGuardType = (typeof CONDITION_GUARD)[keyof typeof CONDITION_GUARD]
