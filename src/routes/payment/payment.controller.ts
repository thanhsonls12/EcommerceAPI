import { Body, Controller, Post } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreatePaymentBodyDTO } from './payment.dto'
import { PaymentService } from './payment.service'
import { Public } from '@/shared/decorators/public.decorator'

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreatePaymentBodyDTO) {
    return this.paymentService.create(userId, body)
  }

  @Public()
  @Post('webhook')
  handleWebhook(@Body() body: unknown) {
    return this.paymentService.handleWebhook(body)
  }
}
