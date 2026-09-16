import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { AdjustInventoryBodyDTO, InventoryHistoryQueryDTO, LowStockQueryDTO } from './inventory.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Adjust SKU inventory' })
  @Post('adjustments')
  @Permissions(PermissionName.InventoryUpdate)
  adjust(@Body() body: AdjustInventoryBodyDTO, @ActiveUser('userId') userId: number) {
    return this.inventoryService.adjust(body, userId)
  }

  @ApiOperation({ summary: 'Get low-stock SKUs' })
  @Get('low-stock')
  @Permissions(PermissionName.InventoryRead)
  findLowStock(@Query() query: LowStockQueryDTO) {
    return this.inventoryService.findLowStock(query.threshold)
  }

  @ApiOperation({ summary: 'Get SKU inventory history' })
  @Get('skus/:skuId/history')
  @Permissions(PermissionName.InventoryRead)
  findHistory(@Param('skuId', ParseIntPipe) skuId: number, @Query() query: InventoryHistoryQueryDTO) {
    return this.inventoryService.findHistory(skuId, query)
  }
}
