import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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
