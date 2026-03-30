import fp from "fastify-plugin"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema/index.js"

export default fp(async (fastify) => {
  const client = postgres(fastify.config.DATABASE_URL)
  const db = drizzle(client, { schema })
  fastify.decorate("db", db)
  fastify.addHook("onClose", async () => {
    await client.end()
  })
})

declare module "fastify" {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>
  }
}
