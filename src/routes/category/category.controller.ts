import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { CategoryService } from './category.service'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { CreateCategoryBodyDTO, UpdateCategoryBodyDTO } from './category.dto'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Permissions(PermissionName.CategoryRead)
  findAll() {
    return this.categoryService.findAll()
  }

  @Post()
  @Permissions(PermissionName.CategoryCreate)
  create(@Body() body: CreateCategoryBodyDTO, @ActiveUser('userId') userId: number) {
    return this.categoryService.create(body, userId)
  }

  @Patch(':id')
  @Permissions(PermissionName.CategoryUpdate)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.categoryService.update(id, body, userId)
  }

  @Delete(':id')
  @Permissions(PermissionName.CategoryDelete)
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.categoryService.delete(id, userId)
  }
}
