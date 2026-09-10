import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'

import { createClient, RedisClientType } from 'redis'
import envConfig from '../config'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType

  constructor() {
    this.client = createClient({
      url: envConfig.REDIS_URL,
    })
  }

  async onModuleInit() {
    await this.client.connect()
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  getClient() {
    return this.client
  }
}
