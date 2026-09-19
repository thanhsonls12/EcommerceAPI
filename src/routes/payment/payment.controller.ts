import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreatePaymentBodyDTO } from './payment.dto'
import { PaymentService } from './payment.service'
import { Public } from '@/shared/decorators/public.decorator'
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create payment for an order' })
  @ApiCreatedResponse({
    description: 'Payment checkout created',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'number', example: 123 },
        checkoutUrl: { type: 'string', format: 'uri', example: 'https://pay.payos.vn/web/example' },
      },
    },
  })
  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreatePaymentBodyDTO) {
    return this.paymentService.create(userId, body)
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user payment status' })
  @Get(':id/status')
  findStatus(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findStatus(userId, id)
  }

  @ApiOperation({ summary: 'Handle payment gateway webhook' })
  @ApiBody({
    description: 'PayOS webhook payload',
    schema: {
      type: 'object',
      required: ['code', 'desc', 'success', 'signature', 'data'],
      properties: {
        code: { type: 'string' },
        desc: { type: 'string' },
        success: { type: 'boolean' },
        signature: { type: 'string' },
        data: {
          type: 'object',
          required: [
            'orderCode',
            'amount',
            'description',
            'accountNumber',
            'reference',
            'transactionDateTime',
            'currency',
            'paymentLinkId',
            'code',
            'desc',
          ],
          properties: {
            orderCode: { type: 'number' },
            amount: { type: 'number' },
            description: { type: 'string' },
            accountNumber: { type: 'string' },
            reference: { type: 'string' },
            transactionDateTime: { type: 'string' },
            currency: { type: 'string' },
            paymentLinkId: { type: 'string' },
            code: { type: 'string' },
            desc: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        duplicate: { type: 'boolean', example: false },
      },
    },
  })
  @Public()
  @Post('webhook')
  handleWebhook(@Body() body: unknown) {
    return this.paymentService.handleWebhook(body)
  }
}
