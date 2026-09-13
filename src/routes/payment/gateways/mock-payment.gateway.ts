/* eslint-disable @typescript-eslint/require-await */
import { BadRequestException, Injectable } from '@nestjs/common'
import {
  CreateGatewayPaymentInput,
  CreateGatewayPaymentResult,
  PaymentGateway,
  VerifiedWebhook,
} from './payment-gateway.interface'
import z from 'zod'

const MockWebhookSchema = z
  .object({
    paymentReference: z.string().min(1),
    transactionReference: z.string().min(1),
    amount: z.number().positive(),
    success: z.boolean(),
  })
  .strict()

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly name = 'MOCK'
  async createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult> {
    return {
      checkoutUrl: `http://localhost:3000/mock-payments/${input.paymentId}`,
      providerReference: `mock-${input.paymentId}`,
    }
  }

  async verifyWebhook(payload: unknown): Promise<VerifiedWebhook> {
    const result = MockWebhookSchema.safeParse(payload)
    if (!result.success) {
      throw new BadRequestException('Invalid webhook payload')
    }
    return {
      paymentReference: result.data.paymentReference,
      transactionReference: result.data.transactionReference,
      amount: result.data.amount,
      success: result.data.success,
      rawBody: payload,
    }
  }
}
