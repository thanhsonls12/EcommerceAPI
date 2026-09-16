/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { ZodSerializationException } from 'nestjs-zod'
import { isNotFoundPrismaError, isUniqueConstraintError } from '../helpers'
import { MESSAGE } from '../constants/message.constant'
import { Request } from 'express'
import { PinoLogger } from 'nestjs-pino'

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CatchEverythingFilter.name)
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()

    const request = ctx.getRequest<Request>()

    let httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message = exception instanceof HttpException ? exception.getResponse() : MESSAGE.SYSTEM.INTERNAL_SERVER_ERROR

    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError()
      this.logger.error(
        {
          requestId: request.id,
          zodError,
        },
        'Response serialization failed',
      )
    }

    if (isUniqueConstraintError(exception)) {
      httpStatus = HttpStatus.CONFLICT
      message = MESSAGE.SYSTEM.RECORD_ALREADY_EXISTS
    }

    if (isNotFoundPrismaError(exception)) {
      httpStatus = HttpStatus.NOT_FOUND
      message = MESSAGE.SYSTEM.RECORD_NOT_FOUND
    }

    this.logger.error(
      {
        requestId: request.id,
        method: request.method,
        url: request.originalUrl,
        statusCode: httpStatus,
        err: exception instanceof Error ? exception : undefined,
      },
      'Request failed',
    )

    const responseBody = {
      statusCode: httpStatus,
      message,
      requestId: request.id,
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }
}
