import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { AppError } from "../lib/errors.js"
import { ImageService, ImageValidationError, ImageModerationError } from "../lib/images/index.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { mediaAssets } from "../db/schema/media-assets.js"

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const imageService = new ImageService(fastify.db)


  // POST /upload/avatar — upload or replace player profile photo
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/upload/avatar",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      if (role !== "player") {
        throw new AppError(403, "WRONG_ROLE", "Only players can upload avatars")
      }

      const data = await request.file()
      if (!data) {
        throw new AppError(400, "NO_FILE", "No file uploaded")
      }

      const buffer = await data.toBuffer()

      // Find existing avatar asset for cleanup
      const [existing] = await fastify.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerUserId, userId))

      try {
        const result = await imageService.uploadProfileImage(
          buffer,
          userId,
          "player_avatar",
          existing?.id
        )

        return reply.code(201).send(ok(result))
      } catch (err) {
        if (err instanceof ImageValidationError) {
          throw new AppError(400, err.code, err.message)
        }
        if (err instanceof ImageModerationError) {
          throw new AppError(400, err.code, err.message)
        }
        throw err
      }
    }
  )

  // POST /upload/logo — upload or replace team logo
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/upload/logo",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      if (role !== "team") {
        throw new AppError(403, "WRONG_ROLE", "Only teams can upload logos")
      }

      const data = await request.file()
      if (!data) {
        throw new AppError(400, "NO_FILE", "No file uploaded")
      }

      const buffer = await data.toBuffer()

      const [existing] = await fastify.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerUserId, userId))

      try {
        const result = await imageService.uploadProfileImage(
          buffer,
          userId,
          "team_logo",
          existing?.id
        )

        return reply.code(201).send(ok(result))
      } catch (err) {
        if (err instanceof ImageValidationError) {
          throw new AppError(400, err.code, err.message)
        }
        if (err instanceof ImageModerationError) {
          throw new AppError(400, err.code, err.message)
        }
        throw err
      }
    }
  )

  // DELETE /upload/avatar — remove player avatar
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/upload/avatar",
    {
      preHandler: [requireSession],
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      if (role !== "player") {
        throw new AppError(403, "WRONG_ROLE", "Only players can remove avatars")
      }

      const [existing] = await fastify.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerUserId, userId))

      if (existing) {
        await imageService.deleteAsset(existing.id, userId)
      }

      // Clear photoUrl on profile
      await fastify.db
        .update(players)
        .set({ photoUrl: null, updatedAt: new Date() })
        .where(eq(players.userId, userId))

      return reply.code(200).send(ok({ removed: true }))
    }
  )

  // DELETE /upload/logo — remove team logo
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/upload/logo",
    {
      preHandler: [requireSession],
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      if (role !== "team") {
        throw new AppError(403, "WRONG_ROLE", "Only teams can remove logos")
      }

      const [existing] = await fastify.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerUserId, userId))

      if (existing) {
        await imageService.deleteAsset(existing.id, userId)
      }

      await fastify.db
        .update(teams)
        .set({ logoUrl: null, updatedAt: new Date() })
        .where(eq(teams.userId, userId))

      return reply.code(200).send(ok({ removed: true }))
    }
  )
}

export default uploadRoutes
