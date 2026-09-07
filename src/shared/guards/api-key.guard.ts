import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import envConfig from '../config'
const SECRET_KEY = envConfig.API_SECRET_KEY
@Injectable()
export class APIKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const xAPIKey = request.headers['x-api-key']
    if (xAPIKey !== SECRET_KEY) {
      throw new UnauthorizedException()
    }
    return true
  }
}
