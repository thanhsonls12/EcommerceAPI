import { Global, Module } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { HashingService } from './services/hashing.service'

import { JwtModule } from '@nestjs/jwt'
import { TokenService } from './services/token.service'
import { AccessTokenGuard } from './guards/access-token.guard'
import { APIKeyGuard } from './guards/api-key.guard'
import { AuthenticationGuard } from './guards/authentication.guard'
import { APP_GUARD } from '@nestjs/core'
import { EmailService } from './services/email.service'

const sharedServices = [PrismaService, HashingService, TokenService, EmailService]

const authGuards = [AccessTokenGuard, APIKeyGuard, AuthenticationGuard]
@Global()
@Module({
  providers: [
    ...sharedServices,
    ...authGuards,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: [...sharedServices, ...authGuards],
  imports: [JwtModule],
})
export class SharedModule {}
