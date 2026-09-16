import z from 'zod'
import { config } from 'dotenv'
import { MESSAGE } from './constants/message.constant'
config()
const booleanEnv = z.enum(['true', 'false']).transform((value) => value === 'true')
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
  REDIS_URL: z.string().min(1),
  PAYOS_CLIENT_ID: z.string().min(1),
  PAYOS_API_KEY: z.string().min(1),
  PAYOS_CHECKSUM_KEY: z.string().min(1),
  PAYOS_RETURN_URL: z.url(),
  PAYOS_CANCEL_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().min(1),
  SWAGGER_ENABLED: booleanEnv.default(true),
  TRUST_PROXY: booleanEnv.default(false),
  VERIFICATION_CODE_SECRET: z.string().min(32),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENABLED: booleanEnv.default(false),
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.log(MESSAGE.SYSTEM.INVALID_ENV)
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
