import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Public } from '@/shared/decorators/public.decorator'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Public()
  @Get('health/live')
  getLiveness() {
    return this.appService.getLiveness()
  }

  @Public()
  @Get('health/ready')
  getReadiness() {
    return this.appService.getReadiness()
  }
}
