import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import { TokenService } from '../services/token.service'
import { MESSAGE } from '../constants/message.constant'
import { REQUEST_USER_KEY } from '../constants/auth.constant'
import { Request } from 'express'

import { PrismaService } from '../services/prisma.service'
import { ensureUserIsActive } from '../helpers/user-status.helper'
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const accessToken = request.headers.authorization?.split(' ')[1]

    if (!accessToken)
      throw new UnauthorizedException({
        message: MESSAGE.AUTH.NOT_LOGGED_IN,
      })

    try {
      const decodedAccessToken = await this.tokenService.verifyAccessToken(accessToken)
      const user = await this.prismaService.user.findUnique({
        where: {
          id: decodedAccessToken.userId,
        },
      })
      if (!user) {
        throw new UnauthorizedException(MESSAGE.AUTH.USER_NOT_FOUND)
      }
      ensureUserIsActive(user.status)
      request[REQUEST_USER_KEY] = { userId: decodedAccessToken.userId }
      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException()
    }
  }
}
