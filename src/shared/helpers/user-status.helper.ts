import { UnauthorizedException } from '@nestjs/common'
import { UserStatus } from '../../../generated/prisma/enums'

export function ensureUserIsActive(status: UserStatus) {
  if (status === UserStatus.INACTIVE) {
    throw new UnauthorizedException('Account is inactive')
  }
  if (status === UserStatus.BLOCKED) {
    throw new UnauthorizedException('Account is blocked')
  }
}
