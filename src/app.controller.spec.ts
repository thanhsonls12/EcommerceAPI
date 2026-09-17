import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  const appService = {
    getHello: jest.fn(() => 'Hello World!'),
    getLiveness: jest.fn(() => ({ status: 'ok' })),
    getReadiness: jest.fn(() =>
      Promise.resolve({
        status: 'ok',
        database: 'up',
        redis: 'up',
      }),
    ),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!')
    })
  })

  describe('health', () => {
    it('should return liveness', () => {
      expect(appController.getLiveness()).toEqual({ status: 'ok' })
      expect(appService.getLiveness).toHaveBeenCalledTimes(1)
    })

    it('should return readiness', async () => {
      await expect(appController.getReadiness()).resolves.toEqual({
        status: 'ok',
        database: 'up',
        redis: 'up',
      })
      expect(appService.getReadiness).toHaveBeenCalledTimes(1)
    })
  })
})
