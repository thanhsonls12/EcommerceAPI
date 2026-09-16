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
import { BrandModule } from './routes/brand/brand.module'
import { ProductModule } from './routes/product/product.module'
import { CartModule } from './routes/cart/cart.module'
import { OrderModule } from './routes/order/order.module'
import { PaymentModule } from './routes/payment/payment.module'
import { BullModule } from '@nestjs/bullmq'
import envConfig from './shared/config'
import { ReviewModule } from './routes/review/review.module'
import { AddressModule } from './routes/address/address.module'
import { PromotionModule } from './routes/promotion/promotion.module'
import { InventoryModule } from './routes/inventory/inventory.module'
import { RealtimeModule } from './routes/realtime/realtime.module'
import { NotificationModule } from './routes/notification/notification.module'

import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'node:crypto'
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
    BrandModule,
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    BullModule.forRoot({
      connection: {
        url: envConfig.REDIS_URL,
      },
    }),
    ReviewModule,
    AddressModule,
    PromotionModule,
    InventoryModule,
    RealtimeModule,
    NotificationModule,
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const headerRequestId = req.headers['x-request-id']

          const requestId = typeof headerRequestId === 'string' ? headerRequestId : randomUUID()

          res.setHeader('x-request-id', requestId)

          return requestId
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.refreshToken',
            'req.body.twoFactorToken',
            'req.body.recoveryCode',
          ],
          censor: '[REDACTED]',
        },
        transport:
          envConfig.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
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
