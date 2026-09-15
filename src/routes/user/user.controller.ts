import { Body, Controller, Get, Patch } from '@nestjs/common'
import { UserService } from './user.service'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ChangePasswordBodyDTO, UpdateProfileBodyDto } from './user.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  @Permissions(PermissionName.UserRead)
  findAll() {
    return this.userService.findAll()
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  getMe(@ActiveUser('userId') userId: number) {
    return this.userService.findById(userId)
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @Patch('me')
  updateMe(@ActiveUser('userId') userId: number, @Body() body: UpdateProfileBodyDto) {
    return this.userService.updateProfile(userId, body)
  }

  @ApiOperation({ summary: 'Change current user password' })
  @Patch('me/password')
  changePassword(@ActiveUser('userId') userId: number, @Body() body: ChangePasswordBodyDTO) {
    return this.userService.changePassword(userId, body)
  }
}
