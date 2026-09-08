import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma, VerificationCodeType } from '../../../generated/prisma/client'

@Injectable()
export class VerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(email: string, type: VerificationCodeType, code: string, expiresAt: Date) {
    return this.prisma.verificationCode.upsert({
      where: {
        email_type: {
          email,
          type,
        },
      },
      create: {
        email,
        type,
        code,
        expiresAt,
      },
      update: {
        code,
        expiresAt,
      },
    })
  }

  findByEmailAndType(email: string, type: VerificationCodeType) {
    return this.prisma.verificationCode.findUnique({
      where: {
        email_type: {
          email,
          type,
        },
      },
    })
  }

  deleteByEmailAndType(email: string, type: VerificationCodeType, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.verificationCode.delete({
      where: {
        email_type: {
          email,
          type,
        },
      },
    })
  }
}
