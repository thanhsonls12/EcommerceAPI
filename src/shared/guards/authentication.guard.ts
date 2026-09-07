import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AUTH_TYPE_KEY } from '../decorators/auth.decorator'
import { PUBLIC_KEY } from '../decorators/public.decorator'
import { AccessTokenGuard } from './access-token.guard'
import { APIKeyGuard } from './api-key.guard'
import { AUTH_TYPE, AuthType, CONDITION_GUARD } from '../constants/auth.constant'

type AuthMetadata = {
  authTypes: AuthType[]
  options: {
    condition: 'and' | 'or'
  }
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: APIKeyGuard,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (isPublic) return true

    const metadata = this.reflector.getAllAndOverride<AuthMetadata>(AUTH_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!metadata) {
      // Không khai báo gì -> mặc định yêu cầu Bearer
      return await this.accessTokenGuard.canActivate(context)
    }

    const guardMap: Record<AuthType, CanActivate> = {
      [AUTH_TYPE.Bearer]: this.accessTokenGuard,
      [AUTH_TYPE.ApiKey]: this.apiKeyGuard,
      [AUTH_TYPE.None]: { canActivate: () => true },
    }
    const results = await Promise.all(
      metadata.authTypes.map((authType) =>
        Promise.resolve(guardMap[authType].canActivate(context)).catch((error) => {
          if (metadata.options.condition === CONDITION_GUARD.Or) return false
          throw error
        }),
      ),
    )

    if (metadata.options.condition === CONDITION_GUARD.And) return results.every(Boolean)
    return results.some(Boolean)
  }
}
