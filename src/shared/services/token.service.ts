import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService, JwtSignOptions } from '@nestjs/jwt'
import envConfig from '../config'
import { TokenType, TokenPayload, TwoFactorTokenPayload } from '../types/jwt.type'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: { userId: number }) {
    return this.jwtService.signAsync(
      { ...payload, type: 'access' satisfies TokenType },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn'],
        algorithm: 'HS256',
      },
    )
  }

  signRefreshToken(payload: { userId: number }) {
    return this.jwtService.signAsync(
      { ...payload, type: 'refresh' satisfies TokenType },
      {
        secret: envConfig.REFRESH_TOKEN_SECRET,
        expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn'],
        algorithm: 'HS256',
      },
    )
  }

  signTwoFactorToken(payload: { userId: number; challengeId: string }) {
    return this.jwtService.signAsync(
      {
        ...payload,
        type: '2fa' satisfies TokenType,
      },
      {
        secret: envConfig.TWO_FACTOR_TOKEN_SECRET,
        expiresIn: envConfig.TWO_FACTOR_TOKEN_EXPIRES_IN as JwtSignOptions['expiresIn'],
        algorithm: 'HS256',
      },
    )
  }

  private async verify(token: string, secret: string, expectedType: TokenType): Promise<TokenPayload> {
    const decoded = await this.jwtService.verifyAsync<TokenPayload>(token, { secret })
    if (decoded.type !== expectedType) {
      throw new UnauthorizedException()
    }
    return decoded
  }

  verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.verify(token, envConfig.ACCESS_TOKEN_SECRET, 'access')
  }

  verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.verify(token, envConfig.REFRESH_TOKEN_SECRET, 'refresh')
  }

  verifyTwoFactorToken(token: string): Promise<TwoFactorTokenPayload> {
    return this.verify(token, envConfig.TWO_FACTOR_TOKEN_SECRET, '2fa') as Promise<TwoFactorTokenPayload>
  }
}
