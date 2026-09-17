import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import envConfig from '../config'
import { MESSAGE } from '../constants/message.constant'

@Injectable()
export class EmailService {
  private readonly resend = new Resend(envConfig.RESEND_API_KEY)

  private async sendEmail(options: { to: string; subject: string; text: string }) {
    const { error } = await this.resend.emails.send({
      from: envConfig.EMAIL_FROM,
      ...options,
    })

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  sendVerificationCode(email: string, code: string) {
    return this.sendEmail({
      to: email,
      subject: MESSAGE.EMAIL.VERIFICATION_CODE_SUBJECT,
      text: MESSAGE.EMAIL.VERIFICATION_CODE_TEXT(code),
    })
  }

  sendOrderCreated(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Order #${orderId} created`,
      text: `Your order #${orderId} has been created and is awaiting payment.`,
    })
  }

  sendOrderPendingDelivery(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Order #${orderId} is on the way`,
      text: `Your order #${orderId} is now pending delivery.`,
    })
  }

  sendOrderDelivered(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Order #${orderId} delivered`,
      text: `Your order #${orderId} has been delivered.`,
    })
  }

  sendOrderReturned(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Order #${orderId} returned`,
      text: `Your order #${orderId} has been marked as returned.`,
    })
  }

  sendOrderCancelled(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Order #${orderId} cancelled`,
      text: `Your order #${orderId} has been cancelled.`,
    })
  }

  sendOrderPaid(email: string, orderId: number) {
    return this.sendEmail({
      to: email,
      subject: `Payment received for order #${orderId}`,
      text: `Payment for order #${orderId} was successful. Your order is now being prepared.`,
    })
  }
}
