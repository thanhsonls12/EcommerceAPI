import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe, ZodValidationPipe } from 'nestjs-zod'
import { MESSAGE } from '../constants/message.constant'
import { ZodError } from 'zod'

const CustomZodValidationPipe: typeof ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    if (!(error instanceof ZodError)) {
      return new UnprocessableEntityException(MESSAGE.VALIDATION.VALIDATION_FAILED)
    }

    return new UnprocessableEntityException({
      message: MESSAGE.VALIDATION.VALIDATION_FAILED,
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    })
  },
})

export default CustomZodValidationPipe
