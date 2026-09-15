import { Body, Controller, Post, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  DisableTwoFactorBodyDTO,
  DisableTwoFactorResDTO,
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
  VerifyTwoFactorLoginBodyDTO,
  VerifyTwoFactorRecoveryBodyDTO,
} from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { Public } from '@/shared/decorators/public.decorator'
import type { Request } from 'express'
import { TwoFactorService } from './two-factor.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @ApiOperation({ summary: 'Register a new account' })
  @Public()
  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Public()
  @Post('login')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @ZodSerializerDto(LoginResDTO)
  login(@Body() body: LoginBodyDTO, @Req() req: Request) {
    return this.authService.login(body, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip ?? '',
    })
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @Public()
  @Post('refresh-token')
  @ZodSerializerDto(RefreshTokenResDTO)
  refreshToken(@Body() body: RefreshTokenBodyDTO) {
    return this.authService.refreshToken(body)
  }

  @ApiOperation({ summary: 'Logout from current device' })
  @Public()
  @Post('logout')
  @ZodSerializerDto(LogoutResDTO)
  logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body)
  }

  @ApiOperation({ summary: 'Verify email address' })
  @Public()
  @Post('verify-email')
  @ZodSerializerDto(VerifyEmailResDTO)
  verifyEmail(@Body() body: VerifyEmailBodyDTO) {
    return this.authService.verifyEmail(body)
  }

  @ApiOperation({ summary: 'Resend email verification code' })
  @Public()
  @Post('resend-verification-code')
  @ZodSerializerDto(ResendVerificationCodeResDTO)
  resendVerificationCode(@Body() body: ResendVerificationCodeBodyDTO) {
    return this.authService.resendVerificationCode(body)
  }

  @ApiOperation({ summary: 'Request password reset code' })
  @Public()
  @Post('forgot-password')
  @ZodSerializerDto(ForgotPasswordResDTO)
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body)
  }

  @ApiOperation({ summary: 'Reset password' })
  @Public()
  @Post('reset-password')
  @ZodSerializerDto(ResetPasswordResDTO)
  resetPassword(@Body() body: ResetPasswordBodyDTO) {
    return this.authService.resetPassword(body)
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set up two-factor authentication' })
  @Post('2fa/setup')
  setupTwoFactor(@ActiveUser('userId') userId: number) {
    return this.twoFactorService.setup(userId)
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @Post('2fa/enable')
  enableTwoFactor(@ActiveUser('userId') userId: number, @Body() body: EnableTwoFactorBodyDTO) {
    return this.twoFactorService.enable(userId, body)
  }

  @ApiOperation({ summary: 'Complete login with TOTP code' })
  @Public()
  @Post('2fa/verify-login')
  @Throttle({
    default: {
      limit: 5,
      ttl: 300_000,
    },
  })
  @ZodSerializerDto(LoginResDTO)
  verifyTwoFactorLogin(@Body() body: VerifyTwoFactorLoginBodyDTO, @Req() req: Request) {
    return this.authService.verifyTwoFactorLogin(body, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip ?? '',
    })
  }

  @ApiOperation({ summary: 'Complete login with recovery code' })
  @Public()
  @Post('2fa/verify-recovery-code')
  @Throttle({
    default: {
      limit: 5,
      ttl: 300_000,
    },
  })
  @ZodSerializerDto(LoginResDTO)
  verifyTwoFactorRecoveryCode(@Body() body: VerifyTwoFactorRecoveryBodyDTO, @Req() req: Request) {
    return this.authService.verifyTwoFactorRecoveryLogin(body, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip ?? '',
    })
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @Post('2fa/disable')
  @ZodSerializerDto(DisableTwoFactorResDTO)
  disableTwoFactor(@ActiveUser('userId') userId: number, @Body() body: DisableTwoFactorBodyDTO) {
    return this.twoFactorService.disable(userId, body)
  }
}
