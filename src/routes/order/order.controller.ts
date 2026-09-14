import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreateOrderBodyDTO } from './order.dto'
import { OrderService } from './order.service'
import { PermissionName } from '@/shared/constants/permission.constant'
import { Permissions } from '@/shared/decorators/permissions.decorator'

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreateOrderBodyDTO) {
    return this.orderService.create(userId, body)
  }

  @Get()
  findMyOrders(@ActiveUser('userId') userId: number) {
    return this.orderService.findMyOrders(userId)
  }

  @Get(':id')
  findMyOrderById(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findMyOrderById(userId, id)
  }

  @Patch(':id/cancel')
  cancel(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(userId, id)
  }

  @Patch(':id/pending-delivery')
  @Permissions(PermissionName.OrderUpdate)
  markPendingDelivery(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markPendingDelivery(id, userId)
  }

  @Patch(':id/delivered')
  @Permissions(PermissionName.OrderUpdate)
  markDelivered(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markDelivered(id, userId)
  }

  @Patch(':id/returned')
  @Permissions(PermissionName.OrderUpdate)
  markReturned(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markReturned(id, userId)
  }
}
