import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { AuthModule } from './routes/auth/auth.module'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { CatchEverythingFilter } from './shared/filters/catch-everything.filter'
import { UserModule } from './routes/user/user.module'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerRedisStorageService } from './shared/services/throttler-redis-storage.service'
import { CategoryModule } from './routes/category/category.module'
@Module({
  imports: [
    SharedModule,
    AuthModule,
    UserModule,
    ThrottlerModule.forRootAsync({
      imports: [SharedModule],
      inject: [ThrottlerRedisStorageService],
      useFactory: (storage: ThrottlerRedisStorageService) => ({
        storage,
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            limit: 100,
          },
        ],
      }),
    }),
    CategoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
