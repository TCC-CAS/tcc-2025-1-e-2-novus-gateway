import fp from "fastify-plugin"
import { z } from "zod"
import type { FastifyPluginAsync } from "fastify"

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
})

export type Env = z.infer<typeof EnvSchema>

declare module "fastify" {
  interface FastifyInstance {
    config: Env
  }
}

const envPlugin: FastifyPluginAsync = async (fastify) => {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(`Environment validation failed:\n${issues}`)
  }
  fastify.decorate("config", result.data)
}

export default fp(envPlugin, { name: "env" })
