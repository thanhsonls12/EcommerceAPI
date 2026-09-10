import { Module } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { DeviceModule } from '../device/device.module'
import { RefreshTokenModule } from '../refresh-token/refresh-token.module'

@Module({
  providers: [UserRepository, UserService],
  exports: [UserRepository],
  controllers: [UserController],
  imports: [DeviceModule, RefreshTokenModule],
})
export class UserModule {}
