import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import { TokenService } from '../services/token.service'
import { REQUEST_USER_KEY } from '../constants/auth.constant'
import { Request } from 'express'
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const accessToken = request.headers.authorization?.split(' ')[1]

    if (!accessToken)
      throw new UnauthorizedException({
        message: 'Chua dang nhap',
      })

    try {
      const decodedAccessToken = await this.tokenService.verifyAccessToken(accessToken)
      request[REQUEST_USER_KEY] = { userId: decodedAccessToken.userId }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
