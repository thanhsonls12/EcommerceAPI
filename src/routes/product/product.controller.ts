import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ProductService } from './product.service'
import { CreateProductBodyDTO, GetProductsQueryDTO, UpdateProductBodyDTO } from './product.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Permissions(PermissionName.ProductRead)
  findAll(@Query() query: GetProductsQueryDTO) {
    return this.productService.findAll(query)
  }

  @Get(':id')
  @Permissions(PermissionName.ProductRead)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id)
  }

  @Post()
  @Permissions(PermissionName.ProductCreate)
  create(@Body() body: CreateProductBodyDTO, @ActiveUser('userId') userId: number) {
    return this.productService.create(body, userId)
  }

  @Patch(':id')
  @Permissions(PermissionName.ProductUpdate)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.productService.update(id, body, userId)
  }

  @Delete(':id')
  @Permissions(PermissionName.ProductDelete)
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.productService.delete(id, userId)
  }
}
