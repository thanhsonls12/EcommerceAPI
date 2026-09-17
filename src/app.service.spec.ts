import { ServiceUnavailableException } from '@nestjs/common'
import { AppService } from './app.service'
import { PrismaService } from './shared/services/prisma.service'
import { RedisService } from './shared/services/redis.service'

describe('AppService', () => {
  const queryRaw = jest.fn()
  const ping = jest.fn()
  const getClient = jest.fn(() => ({ ping }))

  const prisma = {
    $queryRaw: queryRaw,
  } as unknown as PrismaService

  const redis = {
    getClient,
  } as unknown as RedisService

  let service: AppService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AppService(prisma, redis)
  })

  describe('getLiveness', () => {
    it('returns ok without checking external dependencies', () => {
      expect(service.getLiveness()).toEqual({ status: 'ok' })
      expect(queryRaw).not.toHaveBeenCalled()
      expect(getClient).not.toHaveBeenCalled()
    })
  })

  describe('getReadiness', () => {
    it('returns ok when database and redis are available', async () => {
      queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
      ping.mockResolvedValueOnce('PONG')

      await expect(service.getReadiness()).resolves.toEqual({
        status: 'ok',
        database: 'up',
        redis: 'up',
      })
    })

    it('returns 503 when database is unavailable', async () => {
      queryRaw.mockRejectedValueOnce(new Error('database unavailable'))
      ping.mockResolvedValueOnce('PONG')

      await expect(service.getReadiness()).rejects.toMatchObject({
        response: {
          status: 'error',
          database: 'down',
          redis: 'up',
        },
        status: 503,
      } satisfies Partial<ServiceUnavailableException>)
    })

    it('returns 503 when redis is unavailable', async () => {
      queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
      ping.mockRejectedValueOnce(new Error('redis unavailable'))

      await expect(service.getReadiness()).rejects.toMatchObject({
        response: {
          status: 'error',
          database: 'up',
          redis: 'down',
        },
        status: 503,
      } satisfies Partial<ServiceUnavailableException>)
    })
  })
})
