import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { BrandService } from './brand.service'
import { CreateBrandBodyDTO, UpdateBrandBodyDTO } from './brand.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @Permissions(PermissionName.BrandRead)
  findAll() {
    return this.brandService.findAll()
  }

  @Post()
  @Permissions(PermissionName.BrandCreate)
  create(@Body() body: CreateBrandBodyDTO, @ActiveUser('userId') userId: number) {
    return this.brandService.create(body, userId)
  }

  @Patch(':id')
  @Permissions(PermissionName.BrandUpdate)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBrandBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.brandService.update(id, body, userId)
  }

  @Delete(':id')
  @Permissions(PermissionName.BrandDelete)
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.brandService.delete(id, userId)
  }
}
