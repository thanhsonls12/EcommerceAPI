import { Injectable, UnauthorizedException } from '@nestjs/common'
import { RolesService } from './roles.service'
import { HashingService } from '@/shared/services/hashing.service'

import { LoginBodyDTO, RefreshTokenBodyDTO, RegisterBodyDTO } from './auth.dto'
import { UserRepository } from '../user/user.repository'
import { DeviceRepository } from '../device/device.repository'
import { TokenService } from '@/shared/services/token.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'

type LoginDeviceInfo = {
  userAgent: string
  ip: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly rolesService: RolesService,
    private readonly hashingService: HashingService,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}
  async register(body: RegisterBodyDTO) {
    const clientRoleId = await this.rolesService.getClientRoleId()
    const hashedPassword = await this.hashingService.hash(body.password)
    const user = await this.userRepository.create({
      email: body.email,
      password: hashedPassword,
      name: body.name,
      phoneNumber: body.phoneNumber,
      roleId: clientRoleId,
    })
    return user
  }

  async login(body: LoginBodyDTO, deviceInfo: LoginDeviceInfo) {
    const user = await this.userRepository.findByEmail(body.email)

    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect')
    }

    const isPasswordCorrect = await this.hashingService.compare(body.password, user.password)

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Email or password is incorrect')
    }

    const device = await this.deviceRepository.create({
      userId: user.id,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
    })

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId: user.id }),
      this.tokenService.signRefreshToken({ userId: user.id }),
    ])

    const refreshTokenPayload = await this.tokenService.verifyRefreshToken(refreshToken)

    const expiresAt = new Date(refreshTokenPayload.exp * 1000)

    await this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      deviceId: device.id,
      expiresAt,
    })

    return {
      user,
      accessToken,
      refreshToken,
    }
  }

  async refreshToken(body: RefreshTokenBodyDTO) {
    const payload = await this.tokenService.verifyRefreshToken(body.refreshToken)

    const refreshToken = await this.refreshTokenRepository.findByToken(body.refreshToken)

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is invalid')
    }

    if (refreshToken.userId !== payload.userId) {
      throw new UnauthorizedException('Refresh token is invalid')
    }

    const device = await this.deviceRepository.findById(refreshToken.deviceId)

    if (!device || !device.isActive) {
      throw new UnauthorizedException('Device is inactive')
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId: payload.userId }),
      this.tokenService.signRefreshToken({ userId: payload.userId }),
    ])

    const newRefreshTokenPayload = await this.tokenService.verifyRefreshToken(newRefreshToken)

    const expiresAt = new Date(newRefreshTokenPayload.exp * 1000)

    await this.refreshTokenRepository.deleteByToken(body.refreshToken)

    await this.refreshTokenRepository.create({
      token: newRefreshToken,
      userId: payload.userId,
      deviceId: device.id,
      expiresAt,
    })

    return { accessToken, refreshToken: newRefreshToken }
  }

  logout() {}
}
