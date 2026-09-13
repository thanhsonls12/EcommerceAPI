import { BadRequestException, Injectable } from '@nestjs/common'
import {
  CreateGatewayPaymentInput,
  CreateGatewayPaymentResult,
  PaymentGateway,
  VerifiedWebhook,
} from './payment-gateway.interface'
import { PayOS } from '@payos/node'
import envConfig from '@/shared/config'
import { MESSAGE } from '@/shared/constants/message.constant'
import z from 'zod'

const PayOSWebhookSchema = z.object({
  code: z.string(),
  desc: z.string(),
  success: z.boolean(),
  signature: z.string(),
  data: z
    .object({
      orderCode: z.number(),
      amount: z.number(),
      description: z.string(),
      accountNumber: z.string(),
      reference: z.string(),
      transactionDateTime: z.string(),
      currency: z.string(),
      paymentLinkId: z.string(),
      code: z.string(),
      desc: z.string(),
    })
    .passthrough(),
})
@Injectable()
export class PayOSPaymentGateway implements PaymentGateway {
  readonly name = 'PAYOS'

  private readonly payos = new PayOS({
    clientId: envConfig.PAYOS_CLIENT_ID,
    apiKey: envConfig.PAYOS_API_KEY,
    checksumKey: envConfig.PAYOS_CHECKSUM_KEY,
  })

  async createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult> {
    try {
      const result = await this.payos.paymentRequests.create({
        orderCode: input.paymentId,
        amount: input.amount,
        description: input.description,
        returnUrl: envConfig.PAYOS_RETURN_URL,
        cancelUrl: envConfig.PAYOS_CANCEL_URL,
      })
      return {
        checkoutUrl: result.checkoutUrl,
        providerReference: String(result.orderCode),
      }
    } catch (createError) {
      try {
        const existing = await this.payos.paymentRequests.get(input.paymentId)
        if (existing.orderCode !== input.paymentId || existing.amount !== input.amount) {
          throw createError
        }
        return {
          checkoutUrl: `https://pay.payos.vn/web/${existing.id}`,
          providerReference: String(existing.orderCode),
        }
      } catch {
        throw createError
      }
    }
  }

  async verifyWebhook(payload: unknown): Promise<VerifiedWebhook> {
    const parsed = PayOSWebhookSchema.safeParse(payload)
    if (!parsed.success) {
      throw new BadRequestException(MESSAGE.PAYMENT.INVALID_PAYOS_WEBHOOK_PAYLOAD)
    }
    try {
      const data = await this.payos.webhooks.verify(parsed.data)
      return {
        paymentReference: String(data.orderCode),
        transactionReference: data.reference,
        amount: data.amount,
        success: parsed.data.success,
        rawBody: payload,
      }
    } catch {
      throw new BadRequestException(MESSAGE.PAYMENT.INVALID_PAYOS_WEBHOOK_PAYLOAD)
    }
  }
}
