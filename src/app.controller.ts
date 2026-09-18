import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Public } from '@/shared/decorators/public.decorator'
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiOperation({ summary: 'Get API greeting' })
  @ApiOkResponse({ description: 'API is reachable', schema: { type: 'string', example: 'Hello World!' } })
  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Public()
  @ApiOperation({ summary: 'Check application liveness' })
  @ApiOkResponse({
    description: 'Application process is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  @Get('health/live')
  getLiveness() {
    return this.appService.getLiveness()
  }

  @Public()
  @ApiOperation({ summary: 'Check application readiness' })
  @ApiOkResponse({
    description: 'Application dependencies are available',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'up' },
        redis: { type: 'string', example: 'up' },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Database or Redis is unavailable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        database: { type: 'string', example: 'down' },
        redis: { type: 'string', example: 'up' },
      },
    },
  })
  @Get('health/ready')
  getReadiness() {
    return this.appService.getReadiness()
  }
}
