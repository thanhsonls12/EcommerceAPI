import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ReviewRepository } from './review.repository'
import { CreateReviewBodyDTO, GetReviewsQueryDTO, UpdateReviewBodyDTO } from './review.dto'
import { MESSAGE } from '@/shared/constants/message.constant'
import { MediaType, Prisma } from '../../../generated/prisma/client'
import { StorageService } from '@/shared/services/storage.service'

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly storageService: StorageService,
  ) {}

  async create(userId: number, body: CreateReviewBodyDTO) {
    const eligibleOrder = await this.reviewRepository.findDeliveredOrderProduct(body.orderId, body.productId, userId)

    if (!eligibleOrder) {
      throw new BadRequestException(MESSAGE.REVIEW.NOT_ELIGIBLE)
    }

    const existingReview = await this.reviewRepository.findByOrderAndProductIncludingDeleted(
      body.orderId,
      body.productId,
    )

    if (existingReview) {
      throw new ConflictException(MESSAGE.REVIEW.ALREADY_EXISTS)
    }

    try {
      return await this.reviewRepository.create({
        orderId: body.orderId,
        productId: body.productId,
        userId,
        rating: body.rating,
        content: body.content,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(MESSAGE.REVIEW.ALREADY_EXISTS)
      }
      throw error
    }
  }

  async findByProduct(productId: number, query: GetReviewsQueryDTO) {
    const skip = (query.page - 1) * query.limit
    const [reviews, total, ratingSummary] = await Promise.all([
      this.reviewRepository.findManyByProductId(productId, skip, query.limit),
      this.reviewRepository.countByProductId(productId),
      this.reviewRepository.getRatingSummary(productId),
    ])
    return {
      data: reviews,
      rating: {
        average: ratingSummary._avg.rating ?? 0,
        count: ratingSummary._count.rating,
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async update(id: number, userId: number, body: UpdateReviewBodyDTO) {
    const review = await this.reviewRepository.findByIdAndUserId(id, userId)

    if (!review) {
      throw new NotFoundException(MESSAGE.REVIEW.NOT_FOUND)
    }

    if (review.updateCount >= 3) {
      throw new ConflictException(MESSAGE.REVIEW.UPDATE_LIMIT_REACHED)
    }

    const result = await this.reviewRepository.updateIfAllowed(id, userId, {
      ...(body.rating !== undefined && {
        rating: body.rating,
      }),
      ...(body.content !== undefined && {
        content: body.content,
      }),
    })

    if (result.count !== 1) {
      throw new ConflictException(MESSAGE.REVIEW.UPDATE_LIMIT_REACHED)
    }

    return this.reviewRepository.findByIdAndUserId(id, userId)
  }

  async delete(id: number, userId: number) {
    const result = await this.reviewRepository.softDeleteByIdAndUserId(id, userId)

    if (result.count !== 1) {
      throw new NotFoundException(MESSAGE.REVIEW.NOT_FOUND)
    }

    return {
      message: MESSAGE.REVIEW.DELETED_SUCCESSFULLY,
    }
  }

  async uploadMedia(id: number, userId: number, file: Express.Multer.File) {
    const review = await this.reviewRepository.findByIdAndUserId(id, userId)

    if (!review) {
      throw new NotFoundException(MESSAGE.REVIEW.NOT_FOUND)
    }

    const mediaCount = await this.reviewRepository.countMedia(id)

    if (mediaCount >= 5) {
      throw new ConflictException(MESSAGE.REVIEW.MEDIA_LIMIT_REACHED)
    }

    const uploadedFile = await this.storageService.upload(file, 'reviews')

    try {
      return await this.reviewRepository.createMedia(id, uploadedFile.url, uploadedFile.key, MediaType.IMAGE)
    } catch (error) {
      await this.storageService.remove(uploadedFile.key)
      throw error
    }
  }

  async deleteMedia(id: number, mediaId: number, userId: number) {
    const review = await this.reviewRepository.findByIdAndUserId(id, userId)

    if (!review) {
      throw new NotFoundException(MESSAGE.REVIEW.NOT_FOUND)
    }

    const media = await this.reviewRepository.findMediaByIdAndReviewId(mediaId, id)

    if (!media) {
      throw new NotFoundException(MESSAGE.REVIEW.MEDIA_NOT_FOUND)
    }

    if (media.storageKey) {
      await this.storageService.remove(media.storageKey)
    }

    const result = await this.reviewRepository.deleteMedia(mediaId, id)

    if (result.count !== 1) {
      throw new NotFoundException(MESSAGE.REVIEW.MEDIA_NOT_FOUND)
    }

    return {
      message: MESSAGE.REVIEW.MEDIA_DELETED_SUCCESSFULLY,
    }
  }
}
