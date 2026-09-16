import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import envConfig from './shared/config'
import { json, urlencoded } from 'express'
import { Logger } from 'nestjs-pino'
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  })
  app.use(helmet())
  app.use(cookieParser())
  app.use(
    json({
      limit: '1mb',
    }),
  )
  app.use(
    urlencoded({
      extended: true,
      limit: '1mb',
    }),
  )
  app.setGlobalPrefix('api')
  if (envConfig.SWAGGER_ENABLED) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ecommerce API')
      .setDescription('API documentation for the Ecommerce backend')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'access-token',
      )
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document), {
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  }
  if (envConfig.TRUST_PROXY) {
    app.set('trust proxy', 1)
  }
  app.enableCors({
    origin: envConfig.CORS_ORIGIN,
    credentials: true,
  })

  await app.listen(envConfig.PORT)
}

void bootstrap()
