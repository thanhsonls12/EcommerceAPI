import { PrismaService } from '@/shared/services/prisma.service'
import { Prisma, UserStatus } from '../../../generated/prisma/client'
import { Injectable } from '@nestjs/common'
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserUncheckedCreateInput) {
    return this.prisma.user.create({ data })
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  updateStatus(id: number, status: UserStatus, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.user.update({
      where: { id },
      data: { status },
    })
  }
}
