import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { EMAIL_JOB, EMAIL_QUEUE } from '@/shared/queues/email-queue.constant'
import { EmailService } from '@/shared/services/email.service'
import { OrderRepository } from './order.repository'

type OrderEmailJobData = {
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
      case EMAIL_JOB.ORDER_CREATED:
        return this.processOrderCreated(job)

      case EMAIL_JOB.ORDER_PENDING_DELIVERY:
        return this.processOrderPendingDelivery(job)

      case EMAIL_JOB.ORDER_DELIVERED:
        return this.processOrderDelivered(job)

      case EMAIL_JOB.ORDER_RETURNED:
        return this.processOrderReturned(job)

      case EMAIL_JOB.ORDER_CANCELLED:
        return this.processOrderCancelled(job)

      default:
        throw new Error(`Unknown email job: ${job.name}`)
    }
  }

  private async getOrderForEmail(orderId: number) {
    const order = await this.orderRepository.findByIdForEmail(orderId)

    if (!order) {
      throw new Error(`Order #${orderId} not found`)
    }

    return order
  }

  private async processOrderCreated(job: Job<OrderEmailJobData>) {
    const { orderId } = job.data
    const order = await this.getOrderForEmail(orderId)

    await this.emailService.sendOrderCreated(order.user.email, order.id)
  }

  private async processOrderPendingDelivery(job: Job<OrderEmailJobData>) {
    const { orderId } = job.data
    const order = await this.getOrderForEmail(orderId)

    await this.emailService.sendOrderPendingDelivery(order.user.email, order.id)
  }

  private async processOrderDelivered(job: Job<OrderEmailJobData>) {
    const { orderId } = job.data
    const order = await this.getOrderForEmail(orderId)

    await this.emailService.sendOrderDelivered(order.user.email, order.id)
  }

  private async processOrderReturned(job: Job<OrderEmailJobData>) {
    const { orderId } = job.data
    const order = await this.getOrderForEmail(orderId)

    await this.emailService.sendOrderReturned(order.user.email, order.id)
  }

  private async processOrderCancelled(job: Job<OrderEmailJobData>) {
    const { orderId } = job.data
    const order = await this.getOrderForEmail(orderId)

    await this.emailService.sendOrderCancelled(order.user.email, order.id)
  }
}
