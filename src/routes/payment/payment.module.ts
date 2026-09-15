import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller'
import { PaymentRepository } from './payment.repository'
import { PaymentService } from './payment.service'

import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface'
import { PayOSPaymentGateway } from './gateways/payos-payment.gateway'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [NotificationModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentRepository,
    PayOSPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: PayOSPaymentGateway,
    },
  ],
})
export class PaymentModule {}
