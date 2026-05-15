import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { eq, and, desc, count } from "drizzle-orm"
import { requireRole } from "../hooks/require-auth.js"
import { ok, list } from "../lib/response.js"
import { galleryMedia } from "../db/schema/gallery-media.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { ImageStorage } from "../lib/images/storage.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
import {
  PresignRequestSchema,
  ConfirmUploadSchema,
  UpdateGalleryItemSchema,
} from "../../../../shared/contracts/gallery.js"
import type {
  PresignRequest,
  ConfirmUploadRequest,
  UpdateGalleryItemRequest,
} from "../../../../shared/contracts/gallery.js"
import { randomUUID } from "crypto"

const galleryRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = new ImageStorage()

  // Resolve the effective plan ID for a user
  async function getPlanId(userId: string): Promise<PlanId> {
    const [sub] = await fastify.db
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)
    return (sub?.planId ?? "free") as PlanId
  }

  // POST /presign — generate presigned PUT URL for direct S3 upload
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/presign",
    {
      preHandler: [requireRole("player")],
      schema: { body: PresignRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { fileName, mediaType, contentType } = request.body as PresignRequest

      const planId = await getPlanId(userId)
      const limits = getPlanLimits(planId, "player")

      // Block video uploads for non-CRAQUE plans
      if (mediaType === "video" && !limits.videoHighlights) {
        return reply.status(403).send({
          error: { code: "PLAN_LIMIT", message: "Upload de vídeo disponível apenas no plano CRAQUE" },
        })
      }

      // Check item count limit
      const [{ value: itemCount }] = await fastify.db
        .select({ value: count() })
        .from(galleryMedia)
        .where(and(eq(galleryMedia.ownerUserId, userId), eq(galleryMedia.isDeleted, false)))

      if (itemCount >= limits.maxGalleryItems) {
        return reply.status(403).send({
          error: { code: "PLAN_LIMIT", message: `Limite de ${limits.maxGalleryItems} itens na galeria atingido` },
        })
      }

      const assetId = randomUUID()
      const key = `gallery/${userId}/${assetId}-${fileName}`
      const uploadUrl = await storage.getSignedUploadUrl(key, contentType)

      return ok({ uploadUrl, key, assetId })
    }
  )

  // POST /confirm — confirm upload completed, save metadata
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/confirm",
    {
      preHandler: [requireRole("player")],
      schema: { body: ConfirmUploadSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { assetId, caption, isHighlight } = request.body as ConfirmUploadRequest

      // Check duplicate
      const [{ value: existing }] = await fastify.db
        .select({ value: count() })
        .from(galleryMedia)
        .where(and(eq(galleryMedia.id, assetId), eq(galleryMedia.ownerUserId, userId)))

      if (existing > 0) {
        return reply.status(409).send({
          error: { code: "ALREADY_CONFIRMED", message: "Asset já confirmado" },
        })
      }

      const now = new Date()
      const storageKey = `gallery/${userId}/${assetId}`
      const originalUrl = await storage.getUrl(storageKey).catch(() => "")

      const [asset] = await fastify.db
        .insert(galleryMedia)
        .values({
          id: assetId,
          ownerUserId: userId,
          mediaType: "image",
          storageKey,
          fileName: assetId,
          mimeType: "image/webp",
          caption: caption ?? null,
          isHighlight: isHighlight ?? false,
          sortOrder: 0,
          originalUrl,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      return ok(asset)
    }
  )

  // GET /me — own gallery (registered before /:userId to avoid path conflict)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const rows = await fastify.db
        .select()
        .from(galleryMedia)
        .where(and(eq(galleryMedia.ownerUserId, userId), eq(galleryMedia.isDeleted, false)))
        .orderBy(desc(galleryMedia.isHighlight), desc(galleryMedia.createdAt))

      const data = rows.map((item) => ({
        id: item.id,
        mediaType: item.mediaType as "image" | "video",
        caption: item.caption ?? undefined,
        isHighlight: item.isHighlight,
        sortOrder: item.sortOrder,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        mediumUrl: item.mediumUrl ?? undefined,
        originalUrl: item.originalUrl ?? "",
        createdAt: item.createdAt.toISOString(),
      }))

      return list(data, 1, 50, data.length)
    }
  )

  // GET /:userId — public gallery
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:userId",
    {},
    async (request, reply) => {
      const { userId } = request.params as { userId: string }

      const rows = await fastify.db
        .select()
        .from(galleryMedia)
        .where(and(eq(galleryMedia.ownerUserId, userId), eq(galleryMedia.isDeleted, false)))
        .orderBy(desc(galleryMedia.isHighlight), desc(galleryMedia.createdAt))

      const data = rows.map((item) => ({
        id: item.id,
        mediaType: item.mediaType as "image" | "video",
        caption: item.caption ?? undefined,
        isHighlight: item.isHighlight,
        sortOrder: item.sortOrder,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        mediumUrl: item.mediumUrl ?? undefined,
        originalUrl: item.originalUrl ?? "",
        createdAt: item.createdAt.toISOString(),
      }))

      return list(data, 1, 50, data.length)
    }
  )

  // PUT /:assetId — update metadata
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/:assetId",
    {
      preHandler: [requireRole("player")],
      schema: { body: UpdateGalleryItemSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { assetId } = request.params as { assetId: string }
      const { caption, isHighlight, sortOrder } = request.body as UpdateGalleryItemRequest

      const [existing] = await fastify.db
        .select()
        .from(galleryMedia)
        .where(and(eq(galleryMedia.id, assetId), eq(galleryMedia.ownerUserId, userId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Item não encontrado" },
        })
      }

      const now = new Date()
      const [updated] = await fastify.db
        .update(galleryMedia)
        .set({
          ...(caption !== undefined ? { caption } : {}),
          ...(isHighlight !== undefined ? { isHighlight } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          updatedAt: now,
        })
        .where(eq(galleryMedia.id, assetId))
        .returning()

      return ok(updated)
    }
  )

  // DELETE /:assetId — soft delete
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/:assetId",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { assetId } = request.params as { assetId: string }

      const [existing] = await fastify.db
        .select()
        .from(galleryMedia)
        .where(and(
          eq(galleryMedia.id, assetId),
          eq(galleryMedia.ownerUserId, userId),
          eq(galleryMedia.isDeleted, false)
        ))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Item não encontrado" },
        })
      }

      const now = new Date()
      await fastify.db
        .update(galleryMedia)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(galleryMedia.id, assetId))

      await storage.delete(existing.storageKey).catch(() => {})

      return ok({ success: true })
    }
  )
}

export default galleryRoutes
