export interface CreateGatewayPaymentInput {
  paymentId: number
  orderId: number
  amount: number
  description: string
}

export interface CreateGatewayPaymentResult {
  checkoutUrl: string
  providerReference: string
}

export interface VerifiedWebhook {
  paymentReference: string
  transactionReference: string
  amount: number
  success: boolean
  rawBody: unknown
}

export interface PaymentGateway {
  readonly name: string
  createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult>

  verifyWebhook(payload: unknown): Promise<VerifiedWebhook>
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')
