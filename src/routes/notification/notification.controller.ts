import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get current user notifications' })
  @Get()
  findMyNotifications(@ActiveUser('userId') userId: number) {
    return this.notificationService.findMyNotifications(userId)
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  getUnreadCount(@ActiveUser('userId') userId: number) {
    return this.notificationService.getUnreadCount(userId)
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  markAllAsRead(@ActiveUser('userId') userId: number) {
    return this.notificationService.markAllAsRead(userId)
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.notificationService.markAsRead(id, userId)
  }
}
