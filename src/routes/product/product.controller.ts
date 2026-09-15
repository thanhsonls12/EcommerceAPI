import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { ProductService } from './product.service'
import { CreateProductBodyDTO, GetProductsQueryDTO, UpdateProductBodyDTO } from './product.dto'
import { Permissions } from '@/shared/decorators/permissions.decorator'
import { PermissionName } from '@/shared/constants/permission.constant'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Get products' })
  @Get()
  @Permissions(PermissionName.ProductRead)
  findAll(@Query() query: GetProductsQueryDTO) {
    return this.productService.findAll(query)
  }

  @ApiOperation({ summary: 'Get product by id' })
  @Get(':id')
  @Permissions(PermissionName.ProductRead)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id)
  }

  @ApiOperation({ summary: 'Create product' })
  @Post()
  @Permissions(PermissionName.ProductCreate)
  create(@Body() body: CreateProductBodyDTO, @ActiveUser('userId') userId: number) {
    return this.productService.create(body, userId)
  }

  @ApiOperation({ summary: 'Update product' })
  @Patch(':id')
  @Permissions(PermissionName.ProductUpdate)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBodyDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.productService.update(id, body, userId)
  }

  @ApiOperation({ summary: 'Delete product' })
  @Delete(':id')
  @Permissions(PermissionName.ProductDelete)
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.productService.delete(id, userId)
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['image'],
    },
  })
  @ApiOperation({ summary: 'Upload product image' })
  @Post(':id/images')
  @Permissions(PermissionName.ProductUpdate)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @ActiveUser('userId') userId: number,
  ) {
    return this.productService.uploadImage(id, file, userId)
  }
}
