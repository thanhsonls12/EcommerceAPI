import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { MediaType, OrderStatus } from '../../../generated/prisma/client'

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDeliveredOrderProduct(orderId: number, productId: number, userId: number) {
    return this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        deletedAt: null,
        status: OrderStatus.DELIVERED,
        items: {
          some: {
            productId,
          },
        },
      },
      select: {
        id: true,
      },
    })
  }

  findByOrderAndProductIncludingDeleted(orderId: number, productId: number) {
    return this.prisma.review.findUnique({
      where: {
        orderId_productId: {
          orderId,
          productId,
        },
      },
    })
  }

  create(data: { orderId: number; productId: number; userId: number; rating: number; content: string }) {
    return this.prisma.review.create({
      data,
      include: {
        medias: true,
      },
    })
  }

  findManyByProductId(productId: number, skip: number, take: number) {
    return this.prisma.review.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        medias: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    })
  }

  findByIdAndUserId(id: number, userId: number) {
    return this.prisma.review.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        medias: true,
      },
    })
  }

  countByProductId(productId: number) {
    return this.prisma.review.count({
      where: {
        productId,
        deletedAt: null,
      },
    })
  }

  getRatingSummary(productId: number) {
    return this.prisma.review.aggregate({
      where: {
        productId,
        deletedAt: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    })
  }

  updateIfAllowed(
    id: number,
    userId: number,
    data: {
      rating?: number
      content?: string
    },
  ) {
    return this.prisma.review.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
        updateCount: {
          lt: 3,
        },
      },
      data: {
        ...data,
        updateCount: {
          increment: 1,
        },
      },
    })
  }

  softDeleteByIdAndUserId(id: number, userId: number) {
    return this.prisma.review.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  countMedia(reviewId: number) {
    return this.prisma.reviewMedia.count({
      where: {
        reviewId,
      },
    })
  }

  createMedia(reviewId: number, url: string, storageKey: string, type: MediaType) {
    return this.prisma.reviewMedia.create({
      data: {
        reviewId,
        url,
        storageKey,
        type,
      },
    })
  }

  findMediaByIdAndReviewId(mediaId: number, reviewId: number) {
    return this.prisma.reviewMedia.findFirst({
      where: {
        id: mediaId,
        reviewId,
      },
    })
  }

  deleteMedia(mediaId: number, reviewId: number) {
    return this.prisma.reviewMedia.deleteMany({
      where: {
        id: mediaId,
        reviewId,
      },
    })
  }
}
