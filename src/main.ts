import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  })
  app.use(helmet())
  app.use(cookieParser())
  app.setGlobalPrefix('api')
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
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
