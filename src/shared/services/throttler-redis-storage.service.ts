import { Injectable } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import { RedisService } from './redis.service'

@Injectable()
export class ThrottlerRedisStorageService implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const redis = this.redisService.getClient()

    const redisKey = `throttle:${throttlerName}:${key}`
    const blockKey = `${redisKey}:block`

    const result = await redis.eval(
      `
      local blockTtl = redis.call('PTTL', KEYS[2])

      if blockTtl > 0 then
        local current = tonumber(redis.call('GET', KEYS[1])) or (tonumber(ARGV[2]) + 1)
        local ttlRemaining = redis.call('PTTL', KEYS[1])
        return { current, ttlRemaining, 1, blockTtl }
      end

      local current = redis.call('INCR', KEYS[1])

      if current == 1 then
        redis.call('PEXPIRE', KEYS[1], ARGV[1])
      end

      local ttlRemaining = redis.call('PTTL', KEYS[1])

      if current > tonumber(ARGV[2]) then
        redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
        return { current, ttlRemaining, 1, tonumber(ARGV[3]) }
      end

      return { current, ttlRemaining, 0, 0 }
    `,
      {
        keys: [redisKey, blockKey],
        arguments: [ttl.toString(), limit.toString(), blockDuration.toString()],
      },
    )

    const [totalHits, ttlRemaining, blocked, blockTtlRemaining] = result as [number, number, number, number]

    return {
      totalHits,
      timeToExpire: Math.max(0, Math.ceil(ttlRemaining / 1000)),
      isBlocked: blocked === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(blockTtlRemaining / 1000)),
    }
  }
}
