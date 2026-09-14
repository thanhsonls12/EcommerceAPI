import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback)
  }

  countActiveByUserId(tx: Prisma.TransactionClient, userId: number) {
    return tx.address.count({
      where: {
        userId,
        deletedAt: null,
      },
    })
  }

  unsetDefault(tx: Prisma.TransactionClient, userId: number) {
    return tx.address.updateMany({
      where: {
        userId,
        deletedAt: null,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    })
  }

  create(tx: Prisma.TransactionClient, data: Prisma.AddressUncheckedCreateInput) {
    return tx.address.create({
      data,
    })
  }

  findManyByUserId(userId: number) {
    return this.prisma.address.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    })
  }

  findByIdAndUserId(id: number, userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma

    return client.address.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    })
  }

  update(tx: Prisma.TransactionClient, id: number, userId: number, data: Prisma.AddressUpdateInput) {
    return tx.address.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data,
    })
  }

  setDefault(tx: Prisma.TransactionClient, id: number, userId: number) {
    return tx.address.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        isDefault: true,
      },
    })
  }

  softDelete(tx: Prisma.TransactionClient, id: number, userId: number) {
    return tx.address.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    })
  }

  findNewestActive(tx: Prisma.TransactionClient, userId: number) {
    return tx.address.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
