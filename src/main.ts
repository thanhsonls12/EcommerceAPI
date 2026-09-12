import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  })
  app.use(helmet())
  app.use(cookieParser())
  app.setGlobalPrefix('api')

  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
