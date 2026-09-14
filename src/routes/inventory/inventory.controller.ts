import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { AdjustInventoryBodyDTO, LowStockQueryDTO } from './inventory.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('adjustments')
  @Permissions(PermissionName.InventoryUpdate)
  adjust(@Body() body: AdjustInventoryBodyDTO, @ActiveUser('userId') userId: number) {
    return this.inventoryService.adjust(body, userId)
  }

  @Get('low-stock')
  @Permissions(PermissionName.InventoryRead)
  findLowStock(@Query() query: LowStockQueryDTO) {
    return this.inventoryService.findLowStock(query.threshold)
  }

  @Get('skus/:skuId/history')
  @Permissions(PermissionName.InventoryRead)
  findHistory(@Param('skuId', ParseIntPipe) skuId: number) {
    return this.inventoryService.findHistory(skuId)
  }
}
