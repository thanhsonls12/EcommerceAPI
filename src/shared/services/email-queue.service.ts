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

  async addOrderConfirmation(orderId: number) {
    await this.emailQueue.add(
      EMAIL_JOB.ORDER_CONFIRMATION,
      { orderId },
      {
        jobId: `order-confirmation-${orderId}`,
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
