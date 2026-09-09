import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../services/prisma.service'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { REQUEST_USER_KEY } from '../constants/auth.constant'
import type { Request } from 'express'

type RequestUser = {
  userId: number
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermissions?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()

    const requestUser = request[REQUEST_USER_KEY] as RequestUser | undefined

    if (!requestUser) {
      throw new ForbiddenException('User context not found')
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: requestUser.userId,
      },
      select: {
        role: {
          select: {
            isActive: true,
            permissions: {
              where: {
                deletedAt: null,
              },
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!user || !user.role.isActive) {
      throw new ForbiddenException('Access denied')
    }

    const userPermissions = new Set(user.role.permissions.map((permission) => permission.name))

    const hasPermission = requiredPermissions.every((permission) => userPermissions.has(permission))

    if (!hasPermission) {
      throw new ForbiddenException('Access denied')
    }

    return true
  }
}
