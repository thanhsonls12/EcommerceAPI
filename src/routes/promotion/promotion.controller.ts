import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { PromotionService } from './promotion.service'
import { PermissionName } from '@/shared/constants/permission.constant'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { CreatePromotionBodyDTO, UpdatePromotionBodyDTO } from './promotion.dto'

@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @Permissions(PermissionName.PromotionCreate)
  create(@Body() body: CreatePromotionBodyDTO) {
    return this.promotionService.create(body)
  }

  @Get()
  @Permissions(PermissionName.PromotionRead)
  findAll() {
    return this.promotionService.findAll()
  }

  @Get(':id')
  @Permissions(PermissionName.PromotionRead)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findById(id)
  }

  @Patch(':id')
  @Permissions(PermissionName.PromotionUpdate)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePromotionBodyDTO) {
    return this.promotionService.update(id, body)
  }

  @Delete(':id')
  @Permissions(PermissionName.PromotionDelete)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.delete(id)
  }
}
