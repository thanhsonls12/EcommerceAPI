import { Body, Controller, Get, Patch } from '@nestjs/common'
import { UserService } from './user.service'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ChangePasswordBodyDTO, UpdateProfileBodyDto } from './user.dto'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Permissions(PermissionName.UserRead)
  findAll() {
    return this.userService.findAll()
  }

  @Get('me')
  getMe(@ActiveUser('userId') userId: number) {
    return this.userService.findById(userId)
  }

  @Patch('me')
  updateMe(@ActiveUser('userId') userId: number, @Body() body: UpdateProfileBodyDto) {
    return this.userService.updateProfile(userId, body)
  }

  @Patch('me/password')
  changePassword(@ActiveUser('userId') userId: number, @Body() body: ChangePasswordBodyDTO) {
    return this.userService.changePassword(userId, body)
  }
}
