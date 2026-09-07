/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Post, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  LoginBodyDTO,
  LoginResDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
} from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { Public } from '@/shared/decorators/public.decorator'
import type { Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
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
  logout() {
    return this.authService.logout()
  }
}
