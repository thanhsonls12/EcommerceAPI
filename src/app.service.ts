import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from './shared/services/prisma.service'
import { RedisService } from './shared/services/redis.service'

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getHello(): string {
    return 'Hello World!'
  }

  async getHealth() {
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.redis.getClient().ping()])

      return {
        status: 'ok',
        database: 'up',
        redis: 'up',
      }
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unknown',
        redis: 'unknown',
      })
    }
  }
}
