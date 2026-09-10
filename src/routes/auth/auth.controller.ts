import { Body, Controller, Post, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  EnableTwoFactorBodyDTO,
  ForgotPasswordBodyDTO,
  ForgotPasswordResDTO,
  LoginBodyDTO,
  LoginResDTO,
  LogoutBodyDTO,
  LogoutResDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  ResendVerificationCodeBodyDTO,
  ResendVerificationCodeResDTO,
  ResetPasswordBodyDTO,
  ResetPasswordResDTO,
  VerifyEmailBodyDTO,
  VerifyEmailResDTO,
} from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { Public } from '@/shared/decorators/public.decorator'
import type { Request } from 'express'
import { TwoFactorService } from './two-factor.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}
  @Public()
  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @Public()
  @Post('login')
  @ZodSerializerDto(LoginResDTO)
  login(@Body() body: LoginBodyDTO, @Req() req: Request) {
    return this.authService.login(body, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip ?? '',
    })
  }

  @Public()
  @Post('refresh-token')
  @ZodSerializerDto(RefreshTokenResDTO)
  refreshToken(@Body() body: RefreshTokenBodyDTO) {
    return this.authService.refreshToken(body)
  }

  @Public()
  @Post('logout')
  @ZodSerializerDto(LogoutResDTO)
  logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body)
  }

  @Public()
  @Post('verify-email')
  @ZodSerializerDto(VerifyEmailResDTO)
  verifyEmail(@Body() body: VerifyEmailBodyDTO) {
    return this.authService.verifyEmail(body)
  }

  @Public()
  @Post('resend-verification-code')
  @ZodSerializerDto(ResendVerificationCodeResDTO)
  resendVerificationCode(@Body() body: ResendVerificationCodeBodyDTO) {
    return this.authService.resendVerificationCode(body)
  }

  @Public()
  @Post('forgot-password')
  @ZodSerializerDto(ForgotPasswordResDTO)
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body)
  }

  @Public()
  @Post('reset-password')
  @ZodSerializerDto(ResetPasswordResDTO)
  resetPassword(@Body() body: ResetPasswordBodyDTO) {
    return this.authService.resetPassword(body)
  }

  @Post('2fa/setup')
  setupTwoFactor(@ActiveUser('userId') userId: number) {
    return this.twoFactorService.setup(userId)
  }

  @Post('2fa/enable')
  enableTwoFactor(@ActiveUser('userId') userId: number, @Body() body: EnableTwoFactorBodyDTO) {
    return this.twoFactorService.enable(userId, body)
  }
}
