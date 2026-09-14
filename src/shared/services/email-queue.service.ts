import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { EMAIL_JOB, EMAIL_QUEUE } from '../queues/email-queue.constant'
import { Queue } from 'bullmq'

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
  ) {}

  async addOrderCreated(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_CREATED,
      { orderId },
      {
        jobId: `order-created-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }

  async addOrderPendingDelivery(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_PENDING_DELIVERY,
      { orderId },
      {
        jobId: `order-pending-delivery-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }

  async addOrderDelivered(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_DELIVERED,
      { orderId },
      {
        jobId: `order-delivered-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }

  async addOrderReturned(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_RETURNED,
      { orderId },
      {
        jobId: `order-returned-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }

  async addOrderCancelled(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_CANCELLED,
      { orderId },
      {
        jobId: `order-cancelled-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }

  async addOrderPaid(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_PAID,
      { orderId },
      {
        jobId: `order-paid-${orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    )
  }
}
