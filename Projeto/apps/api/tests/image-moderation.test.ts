import { describe, it, expect, afterEach, vi } from "vitest"
import { ImageService, ImageModerationError, setImageModerationServiceForTests } from "../src/lib/images/index.js"
import { ImageProcessor } from "../src/lib/images/processor.js"
import { ImageStorage } from "../src/lib/images/storage.js"

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6WZs0AAAAASUVORK5CYII=",
  "base64"
)

const moderationService = {
  async inspect() {
    return {
      unsafe: true,
      labels: ["Explicit Nudity"],
      confidence: 99,
    }
  },
  async inspectS3Object() {
    return {
      unsafe: true,
      labels: ["Explicit Nudity"],
      confidence: 99,
    }
  },
}

setImageModerationServiceForTests(moderationService)

afterEach(() => {
  vi.restoreAllMocks()
})

describe("image moderation", () => {
  it("blocks unsafe profile images before processing or storage", async () => {
    const processSpy = vi.spyOn(ImageProcessor.prototype, "process")
    const uploadSpy = vi.spyOn(ImageStorage.prototype, "upload")
    const service = new ImageService(({} as any))

    await expect(service.uploadProfileImage(tinyPng, "user-1", "player_avatar")).rejects.toBeInstanceOf(ImageModerationError)
    expect(processSpy).not.toHaveBeenCalled()
    expect(uploadSpy).not.toHaveBeenCalled()
  })
})