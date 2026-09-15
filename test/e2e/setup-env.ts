process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5434/ecommerce_e2e?schema=public'

process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6380'
