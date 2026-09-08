import { Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'
import envConfig from '../config'

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
      subject: 'Email Verification Code',
      text: `Your verification code is: ${code}`,
    })
  }
}
