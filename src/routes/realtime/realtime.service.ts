import { Injectable } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { OrderStatus } from '../../../generated/prisma/enums'

@Injectable()
export class RealtimeService {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  orderUpdated(
    userId: number,
    payload: {
      orderId: number
      status: OrderStatus
    },
  ) {
    this.realtimeGateway.emitToUser(userId, 'order.updated', payload)
  }

  orderPaid(userId: number, orderId: number) {
    this.realtimeGateway.emitToUser(userId, 'order.paid', {
      orderId,
    })
  }

  orderCancelled(userId: number, orderId: number) {
    this.realtimeGateway.emitToUser(userId, 'order.cancelled', {
      orderId,
    })
  }

  notificationCreated(userId: number, notification: unknown) {
    this.realtimeGateway.emitToUser(userId, 'notification.created', notification)
  }
}
