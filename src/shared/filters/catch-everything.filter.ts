import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { ZodSerializationException } from 'nestjs-zod'
import { isNotFoundPrismaError, isUniqueConstraintError } from '../helpers'

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchEverythingFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()

    let httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error'

    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError()
      this.logger.error(zodError)
    }

    if (isUniqueConstraintError(exception)) {
      httpStatus = HttpStatus.CONFLICT
      message = 'Record already exists'
    }

    if (isNotFoundPrismaError(exception)) {
      httpStatus = HttpStatus.NOT_FOUND
      message = 'Record not found'
    }

    const responseBody = {
      statusCode: httpStatus,
      message,
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }
}
