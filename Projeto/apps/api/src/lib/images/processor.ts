/**
 * ImageProcessor — resize, compress, and convert images using Sharp.
 *
 * Produces 3 variants:
 * - thumbnail: 150x150 cover (for lists, cards)
 * - medium: 500x500 inside (for profile headers)
 * - original: max 2000px inside (for lightbox/download)
 *
 * All output is WebP at quality 80, which gives excellent quality-to-size ratio.
 * EXIF/metadata is stripped by default (Sharp removes it on resize).
 */

import sharp from "sharp"

const THUMBNAIL_SIZE = 150
const MEDIUM_SIZE = 500
const ORIGINAL_MAX = 2000
const WEBP_QUALITY = 80

export interface ImageVariants {
  thumbnail: Buffer
  medium: Buffer
  original: Buffer
  metadata: {
    width: number
    height: number
    format: string
  }
}

export class ImageProcessor {
  async process(input: Buffer): Promise<ImageVariants> {
    const image = sharp(input)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not read image dimensions")
    }

    // Reject images with dimensions exceeding the limit
    const maxDimension = parseInt(process.env.IMAGE_MAX_DIMENSION ?? "4000", 10)
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      throw new Error(
        `Image dimensions ${metadata.width}x${metadata.height} exceed limit of ${maxDimension}px`
      )
    }

    const [thumbnail, medium, original] = await Promise.all([
      sharp(input)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", position: "center" })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),

      sharp(input)
        .resize(MEDIUM_SIZE, MEDIUM_SIZE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),

      sharp(input)
        .resize(ORIGINAL_MAX, ORIGINAL_MAX, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    ])

    return {
      thumbnail,
      medium,
      original,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format ?? "unknown",
      },
    }
  }
}
