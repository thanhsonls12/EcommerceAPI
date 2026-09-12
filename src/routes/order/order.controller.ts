import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreateOrderBodyDTO } from './order.dto'
import { OrderService } from './order.service'

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
}
