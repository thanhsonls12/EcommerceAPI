import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller'
import { PaymentRepository } from './payment.repository'
import { PaymentService } from './payment.service'
import { MockPaymentGateway } from './gateways/mock-payment.gateway'
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface'

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentRepository,
    MockPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: MockPaymentGateway,
    },
  ],
})
export class PaymentModule {}
