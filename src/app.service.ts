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

  getLiveness() {
    return {
      status: 'ok',
    }
  }

  async getReadiness() {
    const [databaseResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.getClient().ping(),
    ])

    const database = databaseResult.status === 'fulfilled' ? 'up' : 'down'
    const redis = redisResult.status === 'fulfilled' ? 'up' : 'down'

    if (database === 'down' || redis === 'down') {
      throw new ServiceUnavailableException({
        status: 'error',
        database,
        redis,
      })
    }

    return {
      status: 'ok',
      database,
      redis,
    }
  }
}
