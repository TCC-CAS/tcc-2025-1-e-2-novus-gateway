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

  // S3-compatible storage
  S3_ENDPOINT: z.string().default("https://s3.amazonaws.com"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("varzeapro-media"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_URL: z.string().default(""),
  S3_USE_PATH_STYLE: z.coerce.boolean().default(false),

  // Rekognition moderation
  REKOGNITION_ENABLED: z.coerce.boolean().default(false),
  REKOGNITION_REGION: z.string().default("us-east-1"),
  REKOGNITION_MIN_CONFIDENCE: z.coerce.number().min(0).max(100).default(80),
  REKOGNITION_BLOCKED_LABELS: z.string().default("Explicit Nudity,Violence,Visually Disturbing,Drugs,Alcohol,Tobacco,Gambling,Hate Symbols,Sexual Activity,Suggestive"),

  // Image processing
  IMAGE_MAX_SIZE_MB: z.coerce.number().default(10),
  IMAGE_MAX_DIMENSION: z.coerce.number().default(4000),
  PRESIGNED_URL_TTL_SECONDS: z.coerce.number().default(3600),

  // Upload rate limiting
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().default(10),
  UPLOAD_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(60),
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
