import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'

@Injectable()
export class RecoveryCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(data: Prisma.RecoveryCodeCreateManyInput[], tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.recoveryCode.createMany({ data })
  }

  deleteAllByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.recoveryCode.deleteMany({ where: { userId } })
  }
}
