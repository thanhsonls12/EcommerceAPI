import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { MediaType, Prisma } from '../../../generated/prisma/client'

type ProductSearchRow = {
  id: number
  rank: number
}

type ProductSearchCountRow = {
  count: bigint
}

type ProductSearchFilters = {
  brandId?: number
  categoryId?: number
  minPrice?: number
  maxPrice?: number
}

type ProductSearchParams = ProductSearchFilters & {
  search: string
  skip: number
  take: number
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildSearchFilters(params: ProductSearchFilters) {
    return Prisma.sql`
      ${params.brandId !== undefined ? Prisma.sql`AND p."brandId" = ${params.brandId}` : Prisma.empty}

      ${
        params.categoryId !== undefined
          ? Prisma.sql`
              AND EXISTS (
                SELECT 1
                FROM "_CategoryToProduct" filter_cp
                JOIN "Category" filter_c
                  ON filter_c.id = filter_cp."A"
                WHERE filter_cp."B" = p.id
                  AND filter_cp."A" = ${params.categoryId}
                  AND filter_c."deletedAt" IS NULL
              )
            `
          : Prisma.empty
      }

      ${params.minPrice !== undefined ? Prisma.sql`AND p."basePrice" >= ${params.minPrice}` : Prisma.empty}

      ${params.maxPrice !== undefined ? Prisma.sql`AND p."basePrice" <= ${params.maxPrice}` : Prisma.empty}
    `
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data,
      include: {
        brand: true,
        medias: true,
        categories: true,
      },
    })
  }

  findById(id: number) {
    return this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        brand: true,
        medias: true,
        productTranslations: {
          where: {
            languageId: 'vi',
            deletedAt: null,
          },
          select: {
            languageId: true,
            description: true,
          },
          take: 1,
        },
        categories: {
          where: {
            deletedAt: null,
          },
        },
      },
    })
  }

  findMany(params: {
    where: Prisma.ProductWhereInput
    skip: number
    take: number
    orderBy: Prisma.ProductOrderByWithRelationInput
  }) {
    return this.prisma.product.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      include: {
        brand: true,
        medias: true,
        categories: {
          where: {
            deletedAt: null,
          },
        },
      },
      orderBy: params.orderBy,
    })
  }

  count(where: Prisma.ProductWhereInput) {
    return this.prisma.product.count({ where })
  }

  update(id: number, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        brand: true,
        medias: true,
        categories: true,
      },
    })
  }

  addImage(productId: number, url: string, storageKey: string, userId: number) {
    return this.prisma.$transaction([
      this.prisma.productMedia.create({
        data: {
          productId,
          url,
          storageKey,
          type: MediaType.IMAGE,
        },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: {
          images: {
            push: url,
          },
          updatedBy: {
            connect: {
              id: userId,
            },
          },
        },
        include: {
          brand: true,
          medias: true,
          categories: true,
        },
      }),
    ])
  }

  findImageByIdAndProductId(imageId: number, productId: number) {
    return this.prisma.productMedia.findFirst({
      where: {
        id: imageId,
        productId,
      },
    })
  }

  removeImage(productId: number, imageId: number, images: string[], userId: number) {
    return this.prisma.$transaction([
      this.prisma.productMedia.delete({
        where: {
          id: imageId,
        },
      }),
      this.prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          images: {
            set: images,
          },
          updatedBy: {
            connect: {
              id: userId,
            },
          },
        },
        include: {
          brand: true,
          medias: true,
          categories: true,
        },
      }),
    ])
  }

  softDelete(id: number, deletedById: number) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    })
  }

  searchIds(params: ProductSearchParams) {
    const filters = this.buildSearchFilters(params)

    return this.prisma.$queryRaw<ProductSearchRow[]>`
    SELECT
      p.id,
      (
        ts_rank(
          p."searchVector",
          plainto_tsquery('simple', ${params.search})
        ) +
        CASE
          WHEN lower(p.name) = lower(${params.search}) THEN 4
          WHEN left(lower(p.name), length(${params.search})) = lower(${params.search}) THEN 3
          WHEN position(lower(${params.search}) in lower(p.name)) > 0 THEN 2
          ELSE 0
        END +
        CASE
          WHEN position(lower(${params.search}) in lower(b.name)) > 0 THEN 1
          ELSE 0
        END
      ) AS rank
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    WHERE p."deletedAt" IS NULL
    ${filters}
    AND (
      p."searchVector" @@ plainto_tsquery('simple', ${params.search})
      OR position(lower(${params.search}) in lower(p.name)) > 0
      OR position(lower(${params.search}) in lower(b.name)) > 0
      OR EXISTS (
        SELECT 1
        FROM "_CategoryToProduct" search_cp
        JOIN "Category" search_c
          ON search_c.id = search_cp."A"
        WHERE search_cp."B" = p.id
          AND search_c."deletedAt" IS NULL
          AND position(lower(${params.search}) in lower(search_c.name)) > 0
      )
    )
    ORDER BY rank DESC, p.id DESC
    OFFSET ${params.skip}
    LIMIT ${params.take}
  `
  }

  async countSearch(params: ProductSearchFilters & { search: string }) {
    const filters = this.buildSearchFilters(params)

    const [result] = await this.prisma.$queryRaw<ProductSearchCountRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    WHERE p."deletedAt" IS NULL
    ${filters}
    AND (
      p."searchVector" @@ plainto_tsquery('simple', ${params.search})
      OR position(lower(${params.search}) in lower(p.name)) > 0
      OR position(lower(${params.search}) in lower(b.name)) > 0
      OR EXISTS (
        SELECT 1
        FROM "_CategoryToProduct" search_cp
        JOIN "Category" search_c
          ON search_c.id = search_cp."A"
        WHERE search_cp."B" = p.id
          AND search_c."deletedAt" IS NULL
          AND position(lower(${params.search}) in lower(search_c.name)) > 0
      )
    )
  `

    return Number(result?.count ?? 0n)
  }

  findManyByIds(ids: number[]) {
    return this.prisma.product.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      include: {
        brand: true,
        medias: true,
        categories: {
          where: {
            deletedAt: null,
          },
        },
      },
    })
  }
}
