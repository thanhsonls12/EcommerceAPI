export type TokenType = 'access' | 'refresh'

export type TokenPayload = {
  userId: number
  type: TokenType
  exp: number
  iat: number
}
