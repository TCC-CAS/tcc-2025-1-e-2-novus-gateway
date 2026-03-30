import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const TEST_DB_URL = process.env.DATABASE_URL || "postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro_test"
const MIGRATIONS_DIR = resolve(__dirname, "../../src/db/migrations")

function getAdminUrl(dbUrl: string): string {
  const url = new URL(dbUrl)
  url.pathname = "/postgres"
  return url.toString()
}

export async function setup() {
  // Ensure test DB exists
  const admin = postgres(getAdminUrl(TEST_DB_URL), { max: 1, onnotice: () => {} })
  const dbName = new URL(TEST_DB_URL).pathname.slice(1)
  await admin.unsafe(`CREATE DATABASE ${dbName} OWNER varzeapro`).catch(() => {
    // Ignore "already exists" error
  })
  await admin.end()

  // Run migrations on test DB
  const client = postgres(TEST_DB_URL, { max: 1 })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
  await client.end()
}

export async function teardown() {
  // Truncate all data after the full test run
  const client = postgres(TEST_DB_URL, { max: 1 })
  await client`TRUNCATE TABLE users CASCADE`
  await client.end()
}
