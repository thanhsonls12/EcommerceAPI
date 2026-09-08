import fs from 'fs'
import path from 'path'
import z from 'zod'
import { config } from 'dotenv'
config()
if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Khong tim thay file .env')
  process.exit(1)
}

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(1),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
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
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.log('Cac gia tri khong hop le')
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
