import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { MetricsService } from '../services/metrics.service'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const startedAt = process.hrtime.bigint()

    response.once('finish', () => {
      const durationNs = process.hrtime.bigint() - startedAt
      const durationSeconds = Number(durationNs) / 1_000_000_000

      const routePath = request.route?.path
      const route = routePath ? `${request.baseUrl}${routePath}` : 'unknown'
      const method = request.method
      const status = String(response.statusCode)

      this.metricsService.httpRequests.inc({
        method,
        route,
        status,
      })

      this.metricsService.httpRequestDuration.observe(
        {
          method,
          route,
          status,
        },
        durationSeconds,
      )
    })

    return next.handle()
  }
}
