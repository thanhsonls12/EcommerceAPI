import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5434/ecommerce_e2e?schema=public'

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitForPostgres() {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      try {
        await pool.query('SELECT 1')
        return
      } catch {
        if (attempt === 20) {
          throw new Error(
            'E2E PostgreSQL is not available. Start it with "npm run test:e2e:up" and retry.',
          )
        }

        await sleep(500)
      }
    }
  } finally {
    await pool.end()
  }
}

async function seedMinimumAuthData() {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    await pool.query(
      `
        INSERT INTO "Role" ("name", "description", "isActive", "createdAt", "updatedAt")
        VALUES ('CLIENT', 'E2E client role', true, NOW(), NOW())
        ON CONFLICT ("name")
        DO UPDATE SET
          "description" = EXCLUDED."description",
          "isActive" = true,
          "deletedAt" = NULL,
          "updatedAt" = NOW()
      `,
    )
  } finally {
    await pool.end()
  }
}

async function ensureSchema() {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    const existingRoleTable = await pool.query<{ table_name: string | null }>(
      `SELECT to_regclass('"Role"')::text AS table_name`,
    )

    if (existingRoleTable.rows[0]?.table_name) {
      return
    }

    const prismaCli = path.resolve(process.cwd(), 'node_modules/prisma/build/index.js')
    const schemaSql = execFileSync(
      process.execPath,
      [prismaCli, 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        encoding: 'utf8',
      },
    )

    await pool.query(schemaSql)
  } finally {
    await pool.end()
  }
}

export default async function globalSetup() {
  process.env.DATABASE_URL = databaseUrl
  process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6380'

  await waitForPostgres()
  await ensureSchema()
  await seedMinimumAuthData()
}
