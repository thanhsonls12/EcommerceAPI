import { UnauthorizedException } from '@nestjs/common'
import { MESSAGE } from '../constants/message.constant'
import { UserStatus } from '../../../generated/prisma/enums'

export function ensureUserIsActive(status: UserStatus) {
  if (status === UserStatus.INACTIVE) {
    throw new UnauthorizedException(MESSAGE.AUTH.ACCOUNT_INACTIVE)
  }
  if (status === UserStatus.BLOCKED) {
    throw new UnauthorizedException(MESSAGE.AUTH.ACCOUNT_BLOCKED)
  }
}
