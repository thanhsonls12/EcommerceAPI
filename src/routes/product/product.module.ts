import { Module } from '@nestjs/common'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { ProductRepository } from './product.repository'
import { BrandModule } from '../brand/brand.module'
import { CategoryModule } from '../category/category.module'

@Module({
  imports: [BrandModule, CategoryModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
})
export class ProductModule {}
