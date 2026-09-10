import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RolesService } from './roles.service'
import { UserModule } from '../user/user.module'
import { DeviceModule } from '../device/device.module'
import { RefreshTokenModule } from '../refresh-token/refresh-token.module'
import { VerificationCodeModule } from '../verification-code/verification-code.module'
import { TwoFactorService } from './two-factor.service'
import { RecoveryCodeModule } from '../recovery-code/recovery-code.module'

@Module({
  controllers: [AuthController],
  providers: [AuthService, RolesService, TwoFactorService],
  imports: [UserModule, DeviceModule, RefreshTokenModule, VerificationCodeModule, RecoveryCodeModule],
})
export class AuthModule {}
