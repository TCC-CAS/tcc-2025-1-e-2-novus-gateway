import { buildApp } from "./app.js"

async function main() {
  try {
    const fastify = await buildApp()
    await fastify.listen({ port: fastify.config.PORT, host: "0.0.0.0" })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
