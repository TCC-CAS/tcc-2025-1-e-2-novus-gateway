import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { AppError } from "../lib/errors.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { mkdir, writeFile } from "node:fs/promises"
import { join, extname } from "node:path"
import { randomUUID } from "node:crypto"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /upload/avatar — upload profile photo/logo
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/upload/avatar",
    {
      preHandler: [requireSession],
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      const data = await request.file()
      if (!data) {
        throw new AppError(400, "NO_FILE", "No file uploaded")
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        throw new AppError(400, "INVALID_TYPE", "Only JPEG, PNG, and WebP images are allowed")
      }

      // Validate file size
      const buffer = await data.toBuffer()
      if (buffer.length > MAX_FILE_SIZE) {
        throw new AppError(400, "FILE_TOO_LARGE", "File must be under 5MB")
      }

      // Generate unique filename
      const ext = extname(data.filename) || ".jpg"
      const filename = `${randomUUID()}${ext}`
      const uploadDir = join(process.cwd(), "uploads")
      const filepath = join(uploadDir, filename)

      // Ensure uploads directory exists
      await mkdir(uploadDir, { recursive: true })

      // Write file
      await writeFile(filepath, buffer)

      const url = `/uploads/${filename}`

      // Update profile with new photo URL
      if (role === "player") {
        await fastify.db
          .update(players)
          .set({ photoUrl: url, updatedAt: new Date() })
          .where(eq(players.userId, userId))
      } else if (role === "team") {
        await fastify.db
          .update(teams)
          .set({ logoUrl: url, updatedAt: new Date() })
          .where(eq(teams.userId, userId))
      }

      return reply.code(201).send(ok({ url }))
    }
  )
}

export default uploadRoutes
