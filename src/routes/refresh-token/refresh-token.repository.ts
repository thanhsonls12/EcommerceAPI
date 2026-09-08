import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RefreshTokenUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.refreshToken.create({ data })
  }

  findByToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: {
        token,
      },
    })
  }

  deleteByToken(token: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.refreshToken.delete({
      where: { token },
    })
  }

  deleteAllByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma

    return prismaClient.refreshToken.deleteMany({
      where: {
        userId,
      },
    })
  }
}
