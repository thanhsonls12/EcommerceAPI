import { Injectable, NotFoundException } from '@nestjs/common'
import { NotificationRepository } from './notification.repository'
import { NotificationType, Prisma } from '../../../generated/prisma/client'
import { RealtimeService } from '../realtime/realtime.service'
import { MESSAGE } from '@/shared/constants/message.constant'
import { GetNotificationsQueryDTO } from './notification.dto'

type CreateNotificationInput = {
  userId: number
  type: NotificationType
  title: string
  content: string
  data?: Prisma.InputJsonValue
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.notificationRepository.create(input)

    this.realtimeService.notificationCreated(notification.userId, notification)

    return notification
  }

  async findMyNotifications(userId: number, query: GetNotificationsQueryDTO) {
    const skip = (query.page - 1) * query.limit
    const [data, total] = await Promise.all([
      this.notificationRepository.findManyByUserId(userId, skip, query.limit),
      this.notificationRepository.countByUserId(userId),
    ])

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async getUnreadCount(userId: number) {
    const count = await this.notificationRepository.countUnreadByUserId(userId)

    return {
      count,
    }
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationRepository.findByIdAndUserId(id, userId)

    if (!notification) {
      throw new NotFoundException(MESSAGE.NOTIFICATION.NOT_FOUND)
    }

    await this.notificationRepository.markAsRead(id, userId)

    return {
      success: true,
    }
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepository.markAllAsRead(userId)

    return {
      success: true,
    }
  }
}
