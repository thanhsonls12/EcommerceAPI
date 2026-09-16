import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const startedAt = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt

        this.logger.log(
          `${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms requestId=${request.requestId}`,
        )
      }),
    )
  }
}
