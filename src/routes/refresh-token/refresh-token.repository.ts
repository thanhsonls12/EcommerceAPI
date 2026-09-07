import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RefreshTokenUncheckedCreateInput) {
    return this.prisma.refreshToken.create({ data })
  }

  findByToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: {
        token,
      },
    })
  }

  deleteByToken(token: string) {
    return this.prisma.refreshToken.delete({
      where: { token },
    })
  }
}
