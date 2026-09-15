import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findMyNotifications(@ActiveUser('userId') userId: number) {
    return this.notificationService.findMyNotifications(userId)
  }

  @Get('unread-count')
  getUnreadCount(@ActiveUser('userId') userId: number) {
    return this.notificationService.getUnreadCount(userId)
  }

  @Patch('read-all')
  markAllAsRead(@ActiveUser('userId') userId: number) {
    return this.notificationService.markAllAsRead(userId)
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.notificationService.markAsRead(id, userId)
  }
}
