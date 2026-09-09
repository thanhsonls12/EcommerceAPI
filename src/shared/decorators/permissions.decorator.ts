import { SetMetadata } from '@nestjs/common'
import type { PermissionNameType } from '../constants/permission.constant'

export const PERMISSIONS_KEY = 'permissions'

export const Permissions = (...permissions: PermissionNameType[]) => SetMetadata(PERMISSIONS_KEY, permissions)
