import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { EMAIL_JOB, EMAIL_QUEUE } from '@/shared/queues/email-queue.constant'
import { EmailService } from '@/shared/services/email.service'
import { OrderRepository } from './order.repository'

type OrderConfirmationJobData = {
  orderId: number
}

@Processor(EMAIL_QUEUE)
export class OrderEmailProcessor extends WorkerHost {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly emailService: EmailService,
  ) {
    super()
  }

  async process(job: Job) {
    switch (job.name) {
      case EMAIL_JOB.ORDER_CONFIRMATION:
        return this.processOrderConfirmation(job)

      default:
        throw new Error(`Unknown email job: ${job.name}`)
    }
  }

  private async processOrderConfirmation(job: Job<OrderConfirmationJobData>) {
    const { orderId } = job.data

    const order = await this.orderRepository.findByIdForEmail(orderId)

    if (!order) {
      throw new Error(`Order #${orderId} not found`)
    }

    await this.emailService.sendOrderConfirmation(order.user.email, order.id)
  }
}
