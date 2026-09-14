import { Injectable } from '@nestjs/common'
import { RedisService } from './redis.service'

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisService.getClient().get(key)

    if (!value) {
      return null
    }

    return JSON.parse(value) as T
  }

  async set(key: string, value: unknown, ttlSeconds: number) {
    await this.redisService.getClient().set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    })
  }

  async delete(key: string) {
    await this.redisService.getClient().del(key)
  }

  async increment(key: string) {
    return this.redisService.getClient().incr(key)
  }

  async getString(key: string) {
    return this.redisService.getClient().get(key)
  }

  async setString(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds !== undefined) {
      await this.redisService.getClient().set(key, value, {
        EX: ttlSeconds,
      })
      return
    }

    await this.redisService.getClient().set(key, value)
  }
}
