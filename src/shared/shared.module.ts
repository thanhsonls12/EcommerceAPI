import { Global, Module } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { HashingService } from './services/hashing.service'

import { JwtModule } from '@nestjs/jwt'
import { TokenService } from './services/token.service'
import { AccessTokenGuard } from './guards/access-token.guard'
import { APIKeyGuard } from './guards/api-key.guard'
import { AuthenticationGuard } from './guards/authentication.guard'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { EmailService } from './services/email.service'
import { PermissionsGuard } from './guards/permissions.guard'
import { RedisService } from './services/redis.service'
import { ThrottlerRedisStorageService } from './services/throttler-redis-storage.service'
import { StorageService } from './services/storage.service'
import { CacheService } from './services/cache.service'
import { BullModule } from '@nestjs/bullmq'
import { EMAIL_QUEUE } from './queues/email-queue.constant'
import { EmailQueueService } from './services/email-queue.service'
import { HttpLoggingInterceptor } from './interceptor/http-logging.interceptor'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  EmailService,
  RedisService,
  ThrottlerRedisStorageService,
  StorageService,
  CacheService,
  EmailQueueService,
]

const authGuards = [AccessTokenGuard, APIKeyGuard, AuthenticationGuard, PermissionsGuard]
@Global()
@Module({
  providers: [
    ...sharedServices,

    ...authGuards,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [...sharedServices, ...authGuards],
  imports: [JwtModule, BullModule.registerQueue({ name: EMAIL_QUEUE })],
})
export class SharedModule {}
