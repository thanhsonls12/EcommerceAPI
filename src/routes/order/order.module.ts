import { Module } from '@nestjs/common'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { OrderRepository } from './order.repository'
import { OrderEmailProcessor } from './order-email.processor'

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderEmailProcessor],
})
export class OrderModule {}
