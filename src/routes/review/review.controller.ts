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
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { ReviewService } from './review.service'
import { CreateReviewBodyDTO, GetReviewsQueryDTO, UpdateReviewBodyDTO } from './review.dto'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreateReviewBodyDTO) {
    return this.reviewService.create(userId, body)
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe)
    productId: number,
    @Query() query: GetReviewsQueryDTO,
  ) {
    return this.reviewService.findByProduct(productId, query)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser('userId') userId: number,
    @Body() body: UpdateReviewBodyDTO,
  ) {
    return this.reviewService.update(id, userId, body)
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.reviewService.delete(id, userId)
  }

  @Post(':id/media')
  @UseInterceptors(
    FileInterceptor('media', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadMedia(
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
    return this.reviewService.uploadMedia(id, userId, file)
  }

  @Delete(':id/media/:mediaId')
  deleteMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @ActiveUser('userId') userId: number,
  ) {
    return this.reviewService.deleteMedia(id, mediaId, userId)
  }
}
