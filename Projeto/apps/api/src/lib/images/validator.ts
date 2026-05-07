/**
 * ImageValidator — validates uploaded images using magic bytes, not client-declared MIME.
 *
 * Security: Never trust the Content-Type header or file extension from the client.
 * This module reads the actual file bytes to determine the true format.
 */

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

const MAX_DIMENSION = parseInt(process.env.IMAGE_MAX_DIMENSION ?? "4000", 10)
const MAX_SIZE_BYTES = parseInt(process.env.IMAGE_MAX_SIZE_MB ?? "10", 10) * 1024 * 1024

export class ImageValidator {
  /**
   * Detect MIME type from magic bytes using the 'file-type' package.
   * Returns null if the format is unrecognized or not in the allowlist.
   */
  async detectType(buffer: Buffer): Promise<{ mime: string; ext: string } | null> {
    const { fileTypeFromBuffer } = await import("file-type")
    const result = await fileTypeFromBuffer(buffer)
    if (!result) return null
    if (!ALLOWED_MIME_TYPES.has(result.mime)) return null
    return { mime: result.mime, ext: result.ext }
  }

  /**
   * Validate file size against configurable limit.
   */
  isWithinSizeLimit(buffer: Buffer): { valid: boolean; maxBytes: number; actualBytes: number } {
    return {
      valid: buffer.length <= MAX_SIZE_BYTES,
      maxBytes: MAX_SIZE_BYTES,
      actualBytes: buffer.length,
    }
  }

  /**
   * Full validation — returns validated MIME type or throws.
   */
  async validate(buffer: Buffer): Promise<{ mime: string; ext: string }> {
    const type = await this.detectType(buffer)
    if (!type) {
      throw new ImageValidationError(
        "INVALID_IMAGE_TYPE",
        "File type not recognized or not allowed. Accepted: JPEG, PNG, WebP, AVIF."
      )
    }

    const sizeCheck = this.isWithinSizeLimit(buffer)
    if (!sizeCheck.valid) {
      const sizeMB = (sizeCheck.actualBytes / (1024 * 1024)).toFixed(1)
      const maxMB = (sizeCheck.maxBytes / (1024 * 1024)).toFixed(0)
      throw new ImageValidationError(
        "FILE_TOO_LARGE",
        `File size ${sizeMB}MB exceeds limit of ${maxMB}MB.`
      )
    }

    return type
  }
}

export class ImageValidationError extends Error {
  public readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "ImageValidationError"
    this.code = code
  }
}
