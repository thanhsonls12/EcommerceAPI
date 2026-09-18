import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { SKUService } from './sku.service'
import { CreateSKUBodyDTO, UpdateSKUBodyDTO } from './sku.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

@ApiTags('SKUs')
@ApiBearerAuth('access-token')
@Controller('products/:productId/skus')
export class SKUController {
  constructor(private readonly skuService: SKUService) {}

  @ApiOperation({ summary: 'Get SKUs for a product' })
  @ApiParam({ name: 'productId', type: Number })
  @Get()
  @Permissions(PermissionName.ProductRead)
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.skuService.findAll(productId)
  }

  @ApiOperation({ summary: 'Get a product SKU by id' })
  @ApiParam({ name: 'productId', type: Number })
  @ApiParam({ name: 'skuId', type: Number })
  @Get(':skuId')
  @Permissions(PermissionName.ProductRead)
  findById(@Param('productId', ParseIntPipe) productId: number, @Param('skuId', ParseIntPipe) skuId: number) {
    return this.skuService.findById(productId, skuId)
  }

  @ApiOperation({ summary: 'Create a product SKU' })
  @ApiParam({ name: 'productId', type: Number })
  @Post()
  @Permissions(PermissionName.ProductCreate)
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: CreateSKUBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.skuService.create(productId, body, userId)
  }

  @ApiOperation({ summary: 'Update a product SKU' })
  @ApiParam({ name: 'productId', type: Number })
  @ApiParam({ name: 'skuId', type: Number })
  @Patch(':skuId')
  @Permissions(PermissionName.ProductUpdate)
  update(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('skuId', ParseIntPipe) skuId: number,
    @Body() body: UpdateSKUBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.skuService.update(productId, skuId, body, userId)
  }

  @ApiOperation({ summary: 'Delete a product SKU' })
  @ApiParam({ name: 'productId', type: Number })
  @ApiParam({ name: 'skuId', type: Number })
  @Delete(':skuId')
  @Permissions(PermissionName.ProductDelete)
  delete(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('skuId', ParseIntPipe) skuId: number,
    @ActiveUser('userId') userId: number,
  ) {
    return this.skuService.delete(productId, skuId, userId)
  }
}
