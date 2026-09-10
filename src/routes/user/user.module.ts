import { Module } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { UserService } from './user.service'
import { UserController } from './user.controller'

@Module({
  providers: [UserRepository, UserService],
  exports: [UserRepository],
  controllers: [UserController],
})
export class UserModule {}
