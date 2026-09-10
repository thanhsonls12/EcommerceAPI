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

  findByPhoneNumber(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
    })
  }

  updateStatus(id: number, status: UserStatus, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.user.update({
      where: { id },
      data: { status },
    })
  }

  updatePassword(id: number, password: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma

    return prismaClient.user.update({
      where: { id },
      data: { password },
    })
  }

  findMany() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatar: true,
        status: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  findProfileById(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatar: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  updateProfile(id: number, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: {
        id,
        deletedAt: null,
      },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatar: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  updateTotpSecret(id: number, totpSecret: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma
    return prismaClient.user.update({
      where: { id },
      data: { totpSecret, totpEnabled: false },
    })
  }

  enableTotp(id: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma

    return prismaClient.user.update({
      where: { id },
      data: {
        totpEnabled: true,
      },
    })
  }
}
