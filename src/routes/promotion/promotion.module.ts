import { Module } from '@nestjs/common'
import { PromotionController } from './promotion.controller'
import { PromotionService } from './promotion.service'
import { PromotionRepository } from './promotion.repository'

@Module({
  controllers: [PromotionController],
  providers: [PromotionService, PromotionRepository],
  exports: [PromotionRepository],
})
export class PromotionModule {}
