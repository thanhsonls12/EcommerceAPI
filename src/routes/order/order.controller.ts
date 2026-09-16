import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreateOrderBodyDTO, GetOrdersQueryDTO } from './order.dto'
import { OrderService } from './order.service'
import { PermissionName } from '@/shared/constants/permission.constant'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Create order from current cart' })
  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreateOrderBodyDTO) {
    return this.orderService.create(userId, body)
  }

  @ApiOperation({ summary: 'Get current user orders' })
  @Get()
  findMyOrders(@ActiveUser('userId') userId: number, @Query() query: GetOrdersQueryDTO) {
    return this.orderService.findMyOrders(userId, query)
  }

  @ApiOperation({ summary: 'Get current user order by id' })
  @Get(':id')
  findMyOrderById(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findMyOrderById(userId, id)
  }

  @ApiOperation({ summary: 'Cancel current user order' })
  @Patch(':id/cancel')
  cancel(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(userId, id)
  }

  @ApiOperation({ summary: 'Mark order as pending delivery' })
  @Patch(':id/pending-delivery')
  @Permissions(PermissionName.OrderUpdate)
  markPendingDelivery(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markPendingDelivery(id, userId)
  }

  @ApiOperation({ summary: 'Mark order as delivered' })
  @Patch(':id/delivered')
  @Permissions(PermissionName.OrderUpdate)
  markDelivered(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markDelivered(id, userId)
  }

  @ApiOperation({ summary: 'Mark order as returned' })
  @Patch(':id/returned')
  @Permissions(PermissionName.OrderUpdate)
  markReturned(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.orderService.markReturned(id, userId)
  }
}
