/**
 * ImageService — orchestrates validation, processing, and storage.
 *
 * This is the main entry point used by routes. It composes:
 * - ImageValidator: magic bytes + size checks
 * - ImageProcessor: resize, compress, WebP conversion
 * - ImageStorage: S3 upload, presigned URLs, deletion
 *
 * Usage:
 *   const service = new ImageService(db)
 *   const result = await service.uploadProfileImage(file, userId, "player_avatar", oldPath)
 */

import { randomUUID } from "node:crypto"
import { nanoid } from "nanoid"
import { eq, and } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type * as schema from "../../db/schema/index.js"
import { mediaAssets } from "../../db/schema/media-assets.js"
import { players } from "../../db/schema/players.js"
import { teams } from "../../db/schema/teams.js"
import { ImageValidator, ImageValidationError } from "./validator.js"
import { ImageProcessor } from "./processor.js"
import { ImageStorage } from "./storage.js"
import { getImageModerationService, ImageModerationError } from "./moderation.js"

export interface UploadResult {
  assetId: string
  thumbnailUrl: string
  mediumUrl: string
  originalUrl: string
  sizeBytes: number
  width: number
  height: number
}

export class ImageService {
  private validator: ImageValidator
  private processor: ImageProcessor
  private storage: ImageStorage
  private moderation: ReturnType<typeof getImageModerationService>
  private db: PostgresJsDatabase<typeof schema>

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.validator = new ImageValidator()
    this.processor = new ImageProcessor()
    this.storage = new ImageStorage()
    this.moderation = getImageModerationService()
    this.db = db
  }

  /**
   * Full upload pipeline for profile images (avatars and logos).
   *
   * @param buffer - Raw file buffer from multipart upload
   * @param userId - Owner user ID
   * @param entityType - 'player_avatar' or 'team_logo'
   * @param existingAssetId - If replacing, the ID of the previous media_asset to clean up
   */
  async uploadProfileImage(
    buffer: Buffer,
    userId: string,
    entityType: "player_avatar" | "team_logo",
    existingAssetId?: string
  ): Promise<UploadResult> {
    // 1. Validate
    const { mime } = await this.validator.validate(buffer)

    // 1.5 Moderate the actual image content before we spend CPU on processing/storage.
    const moderation = await this.moderation.inspect(buffer)
    if (moderation.unsafe) {
      throw new ImageModerationError(
        "CONTENT_FLAGGED",
        "Imagem rejeitada pela moderação automática. Envie outra foto."
      )
    }

    // 2. Process — produce 3 sizes in WebP
    const variants = await this.processor.process(buffer)

    // 3. Generate storage paths
    const fileId = randomUUID()
    const prefix = entityType === "player_avatar" ? "avatars" : "logos"
    const thumbnailKey = `${prefix}/${userId}/${fileId}-thumbnail.webp`
    const mediumKey = `${prefix}/${userId}/${fileId}-medium.webp`
    const originalKey = `${prefix}/${userId}/${fileId}-original.webp`

    // 4. Upload all 3 variants to S3 in parallel
    await Promise.all([
      this.storage.upload(thumbnailKey, variants.thumbnail, "image/webp", {
        owner: userId,
        variant: "thumbnail",
        entityType,
      }),
      this.storage.upload(mediumKey, variants.medium, "image/webp", {
        owner: userId,
        variant: "medium",
        entityType,
      }),
      this.storage.upload(originalKey, variants.original, "image/webp", {
        owner: userId,
        variant: "original",
        entityType,
      }),
    ])

    // 5. Generate access URLs
    const [thumbnailUrl, mediumUrl, originalUrl] = await Promise.all([
      this.storage.getUrl(thumbnailKey),
      this.storage.getUrl(mediumKey),
      this.storage.getUrl(originalKey),
    ])

    const assetId = nanoid()
    const totalSize =
      variants.thumbnail.length + variants.medium.length + variants.original.length

    // 6. Insert media_asset record
    await this.db.insert(mediaAssets).values({
      id: assetId,
      ownerUserId: userId,
      entityType,
      storagePath: `${prefix}/${userId}/${fileId}`,
      fileName: `${fileId}.webp`,
      mimeType: mime,
      sizeBytes: totalSize,
      width: variants.metadata.width,
      height: variants.metadata.height,
      thumbnailUrl,
      mediumUrl,
      originalUrl,
    })

    // 7. Update profile with new URLs
    if (entityType === "player_avatar") {
      await this.db
        .update(players)
        .set({ photoUrl: mediumUrl, updatedAt: new Date() })
        .where(eq(players.userId, userId))
    } else {
      await this.db
        .update(teams)
        .set({ logoUrl: mediumUrl, updatedAt: new Date() })
        .where(eq(teams.userId, userId))
    }

    // 8. Clean up old media asset and S3 objects
    if (existingAssetId) {
      await this.cleanupAsset(existingAssetId, userId)
    }

    return {
      assetId,
      thumbnailUrl,
      mediumUrl,
      originalUrl,
      sizeBytes: totalSize,
      width: variants.metadata.width,
      height: variants.metadata.height,
    }
  }

  /**
   * Soft-delete a media asset and remove S3 objects.
   * Ownership check: only the owner can delete.
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const [asset] = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerUserId, userId)))
      .limit(1)

    if (!asset) {
      throw new ImageValidationError("ASSET_NOT_FOUND", "Media asset not found or access denied.")
    }

    await this.cleanupAsset(assetId, userId)
  }

  /**
   * Remove S3 objects and mark the DB record as deleted.
   */
  private async cleanupAsset(assetId: string, userId: string): Promise<void> {
    const [asset] = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, assetId))
      .limit(1)

    if (!asset) return

    // Delete S3 objects
    await this.storage.deletePrefix(asset.storagePath).catch(() => {
      // Don't fail if S3 cleanup fails — log and continue
      console.warn(`[ImageService] Failed to delete S3 prefix: ${asset.storagePath}`)
    })

    // Soft-delete the DB record
    await this.db
      .update(mediaAssets)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(mediaAssets.id, assetId))
  }
}
