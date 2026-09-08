import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RolesService } from './roles.service'
import { UserModule } from '../user/user.module'
import { DeviceModule } from '../device/device.module'
import { RefreshTokenModule } from '../refresh-token/refresh-token.module'
import { VerificationCodeModule } from '../verification-code/verification-code.module'

@Module({
  controllers: [AuthController],
  providers: [AuthService, RolesService],
  imports: [UserModule, DeviceModule, RefreshTokenModule, VerificationCodeModule],
})
export class AuthModule {}
