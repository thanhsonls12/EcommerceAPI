import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { PromotionService } from './promotion.service'
import { PermissionName } from '@/shared/constants/permission.constant'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { CreatePromotionBodyDTO, UpdatePromotionBodyDTO } from './promotion.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Promotions')
@ApiBearerAuth('access-token')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @ApiOperation({ summary: 'Create promotion' })
  @Post()
  @Permissions(PermissionName.PromotionCreate)
  create(@Body() body: CreatePromotionBodyDTO) {
    return this.promotionService.create(body)
  }

  @ApiOperation({ summary: 'Get promotions' })
  @Get()
  @Permissions(PermissionName.PromotionRead)
  findAll() {
    return this.promotionService.findAll()
  }

  @ApiOperation({ summary: 'Get promotion by id' })
  @Get(':id')
  @Permissions(PermissionName.PromotionRead)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findById(id)
  }

  @ApiOperation({ summary: 'Update promotion' })
  @Patch(':id')
  @Permissions(PermissionName.PromotionUpdate)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePromotionBodyDTO) {
    return this.promotionService.update(id, body)
  }

  @ApiOperation({ summary: 'Delete promotion' })
  @Delete(':id')
  @Permissions(PermissionName.PromotionDelete)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.delete(id)
  }
}
