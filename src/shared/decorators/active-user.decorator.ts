import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { RequestUser } from '../types/jwt.type'
import { Request } from 'express'
import { REQUEST_USER_KEY } from '../constants/auth.constant'

export const ActiveUser = createParamDecorator((field: keyof RequestUser | undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>()
  const user = request[REQUEST_USER_KEY] as RequestUser
  return field ? user[field] : user
})
