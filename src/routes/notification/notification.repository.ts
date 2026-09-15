import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { NotificationType, Prisma } from '../../../generated/prisma/client'

type CreateNotificationData = {
  userId: number
  type: NotificationType
  title: string
  content: string
  data?: Prisma.InputJsonValue
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data,
    })
  }

  findManyByUserId(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  countUnreadByUserId(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    })
  }

  markAsRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })
  }

  markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })
  }

  findByIdAndUserId(id: number, userId: number) {
    return this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    })
  }
}
