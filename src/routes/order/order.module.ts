import { Module } from '@nestjs/common'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { OrderRepository } from './order.repository'
import { OrderEmailProcessor } from './order-email.processor'
import { PromotionModule } from '../promotion/promotion.module'
import { InventoryModule } from '../inventory/inventory.module'
import { NotificationModule } from '../notification/notification.module'

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderEmailProcessor],
  imports: [PromotionModule, InventoryModule, NotificationModule],
})
export class OrderModule {}
