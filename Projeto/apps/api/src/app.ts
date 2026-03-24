import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"
import { registerErrorHandler } from "./lib/errors.js"

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== "test",
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Order matters: env first, then plugins, then routes
  await fastify.register(import("./config/env.js"))
  await fastify.register(import("./plugins/cors.js"))
  await fastify.register(import("@fastify/sensible"))

  registerErrorHandler(fastify)

  await fastify.register(import("./routes/health.js"), { prefix: "/health" })

  return fastify
}
