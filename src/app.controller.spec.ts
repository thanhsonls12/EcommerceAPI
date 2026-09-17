import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  const appService = {
    getHello: jest.fn(() => 'Hello World!'),
    getHealth: jest.fn(() =>
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
    it('should return service health', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        database: 'up',
        redis: 'up',
      })
      expect(appService.getHealth).toHaveBeenCalledTimes(1)
    })
  })
})
