import * as Sentry from '@sentry/nestjs'
import envConfig from './shared/config'

if (envConfig.SENTRY_ENABLED && envConfig.SENTRY_DSN) {
  Sentry.init({
    dsn: envConfig.SENTRY_DSN,
    environment: envConfig.NODE_ENV,
  })
}
