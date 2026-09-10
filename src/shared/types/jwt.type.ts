export type TokenType = 'access' | 'refresh' | '2fa'

export type TokenPayload = {
  userId: number
  type: TokenType
  exp: number
  iat: number
}

export type RequestUser = {
  userId: number
}

export type TwoFactorTokenPayload = TokenPayload & {
  challengeId: string
}
