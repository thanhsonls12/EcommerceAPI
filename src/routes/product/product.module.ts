import { Module } from '@nestjs/common'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { ProductRepository } from './product.repository'
import { BrandModule } from '../brand/brand.module'
import { CategoryModule } from '../category/category.module'
import { SKUService } from './sku.service'
import { SKURepository } from './sku.repository'
import { SKUController } from './sku.controller'

@Module({
  imports: [BrandModule, CategoryModule],
  controllers: [ProductController, SKUController],
  providers: [ProductService, ProductRepository, SKUService, SKURepository],
  exports: [SKURepository],
})
export class ProductModule {}
