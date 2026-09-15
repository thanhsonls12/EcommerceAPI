import { Body, Controller, Post } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreatePaymentBodyDTO } from './payment.dto'
import { PaymentService } from './payment.service'
import { Public } from '@/shared/decorators/public.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create payment for an order' })
  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreatePaymentBodyDTO) {
    return this.paymentService.create(userId, body)
  }

  @ApiOperation({ summary: 'Handle payment gateway webhook' })
  @Public()
  @Post('webhook')
  handleWebhook(@Body() body: unknown) {
    return this.paymentService.handleWebhook(body)
  }
}
