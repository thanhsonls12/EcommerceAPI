import { Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'
import envConfig from '../config'
import { MESSAGE } from '../constants/message.constant'

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: envConfig.SMTP_HOST,
    port: envConfig.SMTP_PORT,
    secure: envConfig.SMTP_PORT === 465,
    auth: {
      user: envConfig.SMTP_USER,
      pass: envConfig.SMTP_PASSWORD,
    },
  })

  async sendVerificationCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: MESSAGE.EMAIL.VERIFICATION_CODE_SUBJECT,
      text: MESSAGE.EMAIL.VERIFICATION_CODE_TEXT(code),
    })
  }

  async sendOrderCreated(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Order #${orderId} created`,
      text: `Your order #${orderId} has been created and is awaiting payment.`,
    })
  }

  async sendOrderPendingDelivery(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Order #${orderId} is on the way`,
      text: `Your order #${orderId} is now pending delivery.`,
    })
  }

  async sendOrderDelivered(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Order #${orderId} delivered`,
      text: `Your order #${orderId} has been delivered.`,
    })
  }

  async sendOrderReturned(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Order #${orderId} returned`,
      text: `Your order #${orderId} has been marked as returned.`,
    })
  }

  async sendOrderCancelled(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Order #${orderId} cancelled`,
      text: `Your order #${orderId} has been cancelled.`,
    })
  }

  async sendOrderPaid(email: string, orderId: number) {
    await this.transporter.sendMail({
      from: envConfig.SMTP_FROM,
      to: email,
      subject: `Payment received for order #${orderId}`,
      text: `Payment for order #${orderId} was successful. Your order is now being prepared.`,
    })
  }
}
