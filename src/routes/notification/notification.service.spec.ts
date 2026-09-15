import { Test } from '@nestjs/testing'
import { NotificationService } from './notification.service'
import { NotificationRepository } from './notification.repository'
import { RealtimeService } from '../realtime/realtime.service'
import { NotificationType } from '../../../generated/prisma/enums'

describe('NotificationService', () => {
  let service: NotificationService

  const notificationRepository = {
    create: jest.fn(),
    findManyByUserId: jest.fn(),
    countUnreadByUserId: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    findByIdAndUserId: jest.fn(),
  }

  const realtimeService = {
    notificationCreated: jest.fn(),
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useValue: notificationRepository,
        },
        {
          provide: RealtimeService,
          useValue: realtimeService,
        },
      ],
    }).compile()

    service = moduleRef.get(NotificationService)

    jest.clearAllMocks()
  })

  it('should create notification and emit realtime event', async () => {
    const input = {
      userId: 1,
      type: NotificationType.ORDER,
      title: 'Order delivered',
      content: `Order #1 has been delivered`,
      data: {
        orderId: 1,
      },
    }

    const createdNotification = {
      id: 100,
      ...input,
      readAt: null,
      createdAt: new Date(),
    }

    notificationRepository.create.mockResolvedValue(createdNotification)

    const result = await service.create(input)

    expect(notificationRepository.create).toHaveBeenCalledWith(input)

    expect(realtimeService.notificationCreated).toHaveBeenCalledWith(1, createdNotification)

    expect(result).toEqual(createdNotification)
  })

  it('should return notifications for current user', async () => {
    const notifications = [
      {
        id: 1,
        userId: 1,
        type: NotificationType.ORDER,
        title: 'Order delivered',
        content: 'Order #1 has been delivered',
        data: null,
        readAt: null,
        createdAt: new Date(),
      },
    ]

    notificationRepository.findManyByUserId.mockResolvedValue(notifications)

    const result = await service.findMyNotifications(1)

    expect(notificationRepository.findManyByUserId).toHaveBeenCalledWith(1)

    expect(result).toEqual(notifications)
  })

  it('should return unread notification count', async () => {
    notificationRepository.countUnreadByUserId.mockResolvedValue(3)

    const result = await service.getUnreadCount(1)

    expect(notificationRepository.countUnreadByUserId).toHaveBeenCalledWith(1)

    expect(result).toEqual({
      count: 3,
    })
  })

  it('should mark notification as read', async () => {
    const notification = {
      id: 10,
      userId: 1,
      type: NotificationType.ORDER,
      title: 'Order delivered',
      content: 'Order #1 has been delivered',
      data: null,
      readAt: null,
      createdAt: new Date(),
    }

    notificationRepository.findByIdAndUserId.mockResolvedValue(notification)

    notificationRepository.markAsRead.mockResolvedValue({
      count: 1,
    })

    const result = await service.markAsRead(10, 1)

    expect(notificationRepository.findByIdAndUserId).toHaveBeenCalledWith(10, 1)

    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(10, 1)

    expect(result).toEqual({
      success: true,
    })
  })

  it('should throw NotFoundException when notification does not exist', async () => {
    notificationRepository.findByIdAndUserId.mockResolvedValue(null)

    await expect(service.markAsRead(999, 1)).rejects.toThrow('Notification not found')

    expect(notificationRepository.markAsRead).not.toHaveBeenCalled()
  })

  it('should mark all notifications as read', async () => {
    notificationRepository.markAllAsRead.mockResolvedValue({
      count: 4,
    })

    const result = await service.markAllAsRead(1)

    expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(1)

    expect(result).toEqual({
      success: true,
    })
  })
})
