import { PrismaService } from '@/shared/services/prisma.service'
import { Prisma } from '../../../generated/prisma/client'
import { Injectable } from '@nestjs/common'
@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DeviceUncheckedCreateInput) {
    return this.prisma.device.create({ data })
  }

  findById(id: number) {
    return this.prisma.device.findUnique({
      where: {
        id,
      },
    })
  }
}
