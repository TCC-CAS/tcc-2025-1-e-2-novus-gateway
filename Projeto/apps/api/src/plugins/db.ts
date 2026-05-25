import fp from "fastify-plugin"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import * as schema from "../db/schema/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default fp(async (fastify) => {
  const client = postgres(fastify.config.DATABASE_URL)
  const db = drizzle(client, { schema })

  // Run pending migrations on startup
  const migrationsFolder = join(__dirname, "../db/migrations")
  await migrate(db, { migrationsFolder })
  fastify.log.info("Database migrations applied")

  fastify.decorate("db", db)
  fastify.addHook("onClose", async () => {
    await client.end()
  })
}, { name: "db" })

declare module "fastify" {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>
  }
}
