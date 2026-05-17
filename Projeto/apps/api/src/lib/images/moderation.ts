/**
 * Rekognition-backed image moderation.
 *
 * The service stays optional and can be disabled with REKOGNITION_ENABLED=false.
 * When enabled, it blocks images that Rekognition flags with high confidence.
 */

import { RekognitionClient, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition"

type ModerationDecision = {
  unsafe: boolean
  labels: string[]
  confidence: number
}

export class ImageModerationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ImageModerationError"
  }
}

export interface ImageModerationServiceLike {
  inspect(buffer: Buffer): Promise<ModerationDecision>
  inspectS3Object(bucket: string, key: string): Promise<ModerationDecision>
}

function parseBlockedLabels(): Set<string> {
  const value = process.env.REKOGNITION_BLOCKED_LABELS ?? ""
  return new Set(
    value
      .split(",")
      .map((label) => label.trim().toLowerCase())
      .filter(Boolean)
  )
}

function shouldModerate(): boolean {
  return (process.env.REKOGNITION_ENABLED ?? "false") === "true"
}

function getMinConfidence(): number {
  return parseFloat(process.env.REKOGNITION_MIN_CONFIDENCE ?? "80")
}

async function toBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0)
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)

  const chunks: Buffer[] = []
  const iterable = body as AsyncIterable<Uint8Array>
  for await (const chunk of iterable) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

class RekognitionModerationService implements ImageModerationServiceLike {
  private client: RekognitionClient | null = null
  private readonly blockedLabels = parseBlockedLabels()
  private readonly enabled = shouldModerate()
  private readonly minConfidence = getMinConfidence()

  private getClient(): RekognitionClient {
    if (!this.client) {
      this.client = new RekognitionClient({
        region: process.env.REKOGNITION_REGION ?? process.env.S3_REGION ?? "us-east-1",
      })
    }
    return this.client
  }

  private normalizeResult(labels: Array<{ Name?: string; Confidence?: number; ParentName?: string }>): ModerationDecision {
    const flagged = labels.filter((label) => {
      const name = label.Name?.toLowerCase() ?? ""
      const parent = label.ParentName?.toLowerCase() ?? ""
      const confidence = label.Confidence ?? 0
      return confidence >= this.minConfidence && (this.blockedLabels.has(name) || this.blockedLabels.has(parent))
    })

    const confidence = flagged.reduce((max, label) => Math.max(max, label.Confidence ?? 0), 0)
    return {
      unsafe: flagged.length > 0,
      labels: flagged.map((label) => label.Name ?? label.ParentName ?? "unknown"),
      confidence,
    }
  }

  async inspect(buffer: Buffer): Promise<ModerationDecision> {
    if (!this.enabled) {
      return { unsafe: false, labels: [], confidence: 0 }
    }

    const response = await this.getClient().send(
      new DetectModerationLabelsCommand({
        Image: { Bytes: buffer },
        MinConfidence: this.minConfidence,
      })
    )

    return this.normalizeResult(response.ModerationLabels ?? [])
  }

  async inspectS3Object(bucket: string, key: string): Promise<ModerationDecision> {
    if (!this.enabled) {
      return { unsafe: false, labels: [], confidence: 0 }
    }

    const response = await this.getClient().send(
      new DetectModerationLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        MinConfidence: this.minConfidence,
      })
    )

    return this.normalizeResult(response.ModerationLabels ?? [])
  }
}

let moderationService: ImageModerationServiceLike = new RekognitionModerationService()

export function getImageModerationService(): ImageModerationServiceLike {
  return moderationService
}

export function setImageModerationServiceForTests(service: ImageModerationServiceLike | null) {
  moderationService = service ?? new RekognitionModerationService()
}
