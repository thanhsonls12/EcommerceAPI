import fs from 'fs'
import path from 'path'
import z from 'zod'
import { config } from 'dotenv'
import { MESSAGE } from './constants/message.constant'
config()
if (!fs.existsSync(path.resolve('.env'))) {
  console.log(MESSAGE.SYSTEM.ENV_FILE_NOT_FOUND)
  process.exit(1)
}

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1),
  ADMIN_NAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PHONENUMBER: z.string().min(1),
  API_SECRET_KEY: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().email(),
  TWO_FACTOR_TOKEN_SECRET: z.string().min(32),
  TWO_FACTOR_TOKEN_EXPIRES_IN: z.string().min(1),
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.log(MESSAGE.SYSTEM.INVALID_ENV)
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
