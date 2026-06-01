import "dotenv/config"
import { buildApp } from "./app.js"

async function main() {
  try {
    const fastify = await buildApp()
    const host = process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0"
    await fastify.listen({ port: fastify.config.PORT, host })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
