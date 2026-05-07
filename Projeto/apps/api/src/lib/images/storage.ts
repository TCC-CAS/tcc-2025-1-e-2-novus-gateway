/**
 * ImageStorage — S3-compatible storage with presigned URL support.
 *
 * Provider-agnostic: works with AWS S3, Cloudflare R2, MinIO, and any S3-compatible API.
 * Configure via environment variables (see env.ts for all options).
 *
 * Security:
 * - Presigned URLs with configurable TTL for GET operations
 * - Direct SDK upload for PUT (server holds credentials, never exposes them to client)
 * - UUID-based paths prevent enumeration
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"

function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT || "https://s3.amazonaws.com"
  const region = process.env.S3_REGION || "us-east-1"
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || ""
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || ""
  const usePathStyle = process.env.S3_USE_PATH_STYLE === "true"

  // If no credentials are set, the SDK falls back to IAM role / instance profile
  const credentials =
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined

  return new S3Client({
    endpoint: endpoint !== "https://s3.amazonaws.com" ? endpoint : undefined,
    region,
    credentials,
    forcePathStyle: usePathStyle,
  })
}

// Singleton — reused across requests
let _client: S3Client | null = null
function getClient(): S3Client {
  if (!_client) _client = createS3Client()
  return _client
}

export class ImageStorage {
  private client: S3Client
  private bucket: string
  private publicUrl: string
  private presignedTTL: number

  constructor() {
    this.client = getClient()
    this.bucket = process.env.S3_BUCKET || "varzeapro-media"
    this.publicUrl = process.env.S3_PUBLIC_URL || ""
    this.presignedTTL = parseInt(process.env.PRESIGNED_URL_TTL_SECONDS ?? "3600", 10)
  }

  /**
   * Upload a buffer to S3.
   * The key should be a structured path like "avatars/{userId}/{uuid}-thumbnail.webp".
   * Metadata is stored as S3 object metadata for auditing.
   */
  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      // Objects are private by default — access only via presigned URLs
    }

    await this.client.send(new PutObjectCommand(params))
  }

  /**
   * Generate a presigned URL for downloading an object.
   * URLs expire after presignedTTL seconds (default 1 hour).
   */
  async getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const url = await getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds ?? this.presignedTTL,
    })

    return url
  }

  /**
   * Build a public/CDN URL for an object.
   * If S3_PUBLIC_URL is configured, uses that as the base (for CDN).
   * Otherwise generates a presigned URL.
   */
  async getUrl(key: string): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, "")}/${key}`
    }
    return this.getSignedUrl(key)
  }

  /**
   * Delete an object from S3.
   * Returns true even if the object doesn't exist (idempotent).
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
    } catch (err) {
      // If the object doesn't exist, that's fine
      if (err instanceof Error && err.name === "NoSuchKey") return
      throw err
    }
  }

  /**
   * Delete all objects under a prefix.
   * Used when replacing a user's avatar/logo — removes old variants.
   * Note: S3 has no "delete by prefix" API, but for our use case
   * we always know the exact keys. This is a safety net.
   */
  async deletePrefix(prefix: string): Promise<void> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3")
    const listResult = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    )

    if (!listResult.Contents || listResult.Contents.length === 0) return

    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3")
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })),
        },
      })
    )
  }

  /**
   * Check if an object exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }
}
