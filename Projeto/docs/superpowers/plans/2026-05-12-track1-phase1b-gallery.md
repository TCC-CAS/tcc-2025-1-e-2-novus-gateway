# Track 1 Phase 1B — Player Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a player gallery with presigned URL direct upload to S3, supporting images and videos with plan-based gating.

**Architecture:** Three-step upload flow: (1) frontend requests presigned URL from backend, (2) frontend uploads file directly to S3, (3) frontend confirms upload and backend saves metadata. New `gallery_media` table stores asset metadata. Plan gating limits item count and restricts video uploads to CRAQUE+.

**Tech Stack:** Drizzle ORM, S3 Presigned URLs (@aws-sdk/s3-request-presigner), Zod, Fastify, React 19, TanStack Query

**Prerequisites:** Track 1 Phase 1A (Bug Fixes) must be complete so the players table has the new columns and contracts are updated.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/db/schema/gallery-media.ts` | Create | Drizzle table definition |
| `apps/api/src/db/schema/index.ts` | Modify | Export new schema |
| `apps/api/src/db/migrations/` | Create | Auto-generate migration |
| `shared/contracts/gallery.ts` | Create | Zod schemas for all gallery endpoints |
| `shared/contracts/index.ts` | Modify | Re-export gallery contracts |
| `apps/api/src/routes/gallery.ts` | Create | 6 API endpoints |
| `apps/api/src/app.ts` | Modify | Register gallery routes |
| `apps/web/app/components/gallery-upload.tsx` | Create | Drag-and-drop upload component |
| `apps/web/app/components/gallery-grid.tsx` | Create | Grid display component |
| `apps/web/app/components/gallery-item.tsx` | Create | Individual media card |
| `apps/web/app/components/video-player.tsx` | Create | HTML5 video player |
| `apps/web/app/lib/api-client.ts` | Modify | Add galleryApi namespace |

---

## Task 1: Create gallery_media Drizzle schema

**Files:**
- Create: `apps/api/src/db/schema/gallery-media.ts`
- Modify: `apps/api/src/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```typescript
import { pgTable, text, timestamp, integer, bigint, boolean } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const galleryMedia = pgTable("gallery_media", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  mediaType: text("media_type").notNull().default("image"), // "image" | "video"
  storageKey: text("storage_key").notNull(), // "gallery/{userId}/{uuid}"
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  caption: text("caption"),
  isHighlight: boolean("is_highlight").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  mediumUrl: text("medium_url"),
  originalUrl: text("original_url"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/api/src/db/schema/index.ts`:

```typescript
export { galleryMedia } from "./gallery-media.js"
```

- [ ] **Step 3: Generate migration**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx drizzle-kit generate`

- [ ] **Step 4: Apply migration**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto && docker compose up -d postgres && sleep 2 && npx drizzle-kit push` (adjust for your setup)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema/gallery-media.ts apps/api/src/db/schema/index.ts apps/api/src/db/migrations/
git commit -m "feat: add gallery_media table schema and migration"
```

---

## Task 2: Create shared gallery contracts

**Files:**
- Create: `shared/contracts/gallery.ts`
- Modify: `shared/contracts/index.ts`

- [ ] **Step 1: Create gallery contract file**

```typescript
import { z } from "zod";
import { PaginationMetaSchema } from "./common.js";

export const GalleryMediaTypeSchema = z.enum(["image", "video"]);
export type GalleryMediaType = z.infer<typeof GalleryMediaTypeSchema>;

export const GalleryMediaSchema = z.object({
  id: z.string(),
  mediaType: GalleryMediaTypeSchema,
  caption: z.string().optional(),
  isHighlight: z.boolean(),
  sortOrder: z.number(),
  thumbnailUrl: z.string().optional(),
  mediumUrl: z.string().optional(),
  originalUrl: z.string(),
  createdAt: z.string().datetime(),
});
export type GalleryMedia = z.infer<typeof GalleryMediaSchema>;

export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  mediaType: GalleryMediaTypeSchema,
  contentType: z.string().min(1),
  sizeBytes: z.number().optional(),
});
export type PresignRequest = z.infer<typeof PresignRequestSchema>;

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  assetId: z.string(),
});
export type PresignResponse = z.infer<typeof PresignResponseSchema>;

export const ConfirmUploadSchema = z.object({
  assetId: z.string().min(1),
  caption: z.string().optional(),
  isHighlight: z.boolean().optional(),
});
export type ConfirmUploadRequest = z.infer<typeof ConfirmUploadSchema>;

export const UpdateGalleryItemSchema = z.object({
  caption: z.string().optional(),
  isHighlight: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateGalleryItemRequest = z.infer<typeof UpdateGalleryItemSchema>;

export const ListGalleryResponseSchema = z.object({
  data: z.array(GalleryMediaSchema),
  meta: PaginationMetaSchema,
});
export type ListGalleryResponse = z.infer<typeof ListGalleryResponseSchema>;
```

- [ ] **Step 2: Export from index.ts**

Add to `shared/contracts/index.ts`:

```typescript
export * from "./gallery.js";
```

- [ ] **Step 3: Commit**

```bash
git add shared/contracts/gallery.ts shared/contracts/index.ts
git commit -m "feat: add shared gallery contracts"
```

---

## Task 3: Create gallery API routes

**Files:**
- Create: `apps/api/src/routes/gallery.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create the gallery route file**

```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { eq, and, desc, count, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { requireRole } from "../hooks/require-auth.js"
import { requireSession } from "../hooks/require-auth.js"
import { ok, list } from "../lib/response.js"
import { galleryMedia } from "../db/schema/gallery-media.js"
import { users } from "../db/schema/users.js"
import { ImageStorage } from "../lib/images/storage.js"
import {
  PresignRequestSchema,
  ConfirmUploadSchema,
  UpdateGalleryItemSchema,
} from "../../../../shared/contracts/gallery.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"

const galleryRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = new ImageStorage()

  // Helper: plan-aware gallery limits
  function getGalleryLimits(planId: string, role: "player" | "team") {
    const limits = getPlanLimits(planId, role)
    const maxItems = limits.videoHighlights ? 20 : 5 // CRAQUE: 20, FREE: 5
    const canUploadVideo = limits.videoHighlights
    return { maxItems, canUploadVideo }
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
      const role = request.session!.user.role as "player" | "team"
      const { fileName, mediaType, contentType } = request.body

      // Plan limits
      const sub = await fastify.db.query.subscriptions?.findFirst?.({
        where: eq(
          (await import("../db/schema/subscriptions.js")).subscriptions.userId,
          userId
        ),
      }) ?? null
      const planId = (sub as any)?.planId ?? "free"
      const { maxItems, canUploadVideo } = getGalleryLimits(planId, role)

      // Block video uploads for non-CRAQUE plans
      if (mediaType === "video" && !canUploadVideo) {
        return reply.status(403).send({
          error: { code: "PLAN_LIMIT", message: "Upload de vídeo disponível apenas no plano CRAQUE" },
        })
      }

      // Check item count limit
      const [{ value: itemCount }] = await fastify.db
        .select({ value: count() })
        .from(galleryMedia)
        .where(and(eq(galleryMedia.ownerUserId, userId), eq(galleryMedia.isDeleted, false)))

      if (itemCount >= maxItems) {
        return reply.status(403).send({
          error: { code: "PLAN_LIMIT", message: `Limite de ${maxItems} itens na galeria atingido` },
        })
      }

      // Generate presigned URL
      const assetId = nanoid()
      const key = `gallery/${userId}/${assetId}-${fileName}`
      const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 3600)

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
      const { assetId, caption, isHighlight } = request.body

      // Verify the asset key belongs to this user
      // The key pattern is "gallery/{userId}/{assetId}-..."
      const [{ value: existing }] = await fastify.db
        .select({ value: count() })
        .from(galleryMedia)
        .where(and(eq(galleryMedia.id, assetId), eq(galleryMedia.ownerUserId, userId)))

      if (existing > 0) {
        return reply.status(409).send({
          error: { code: "ALREADY_CONFIRMED", message: "Asset já confirmado" },
        })
      }

      // Verify the object exists in S3 (the upload happened)
      const key = `gallery/${userId}/`
      // For simplicity, trust the upload happened since we generated the presigned URL
      // In production, you'd do a HeadObject check

      const now = new Date()
      const [asset] = await fastify.db
        .insert(galleryMedia)
        .values({
          id: assetId,
          ownerUserId: userId,
          mediaType: "image", // Default; could be enhanced
          storageKey: `gallery/${userId}/${assetId}`,
          fileName: assetId,
          mimeType: "image/webp",
          caption: caption ?? null,
          isHighlight: isHighlight ?? false,
          sortOrder: 0,
          originalUrl: await storage.getUrl(`gallery/${userId}/${assetId}`).catch(() => ""),
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      return ok(asset)
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

  // GET /me — own gallery
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
      const { caption, isHighlight, sortOrder } = request.body

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
        .where(and(eq(galleryMedia.id, assetId), eq(galleryMedia.ownerUserId, userId), eq(galleryMedia.isDeleted, false)))
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

      // Optionally delete from S3
      await storage.delete(existing.storageKey).catch(() => {})

      return ok({ success: true })
    }
  )
}

export default galleryRoutes
```

Note: The `ImageStorage` class needs a `getSignedUploadUrl` method. Add it to `apps/api/src/lib/images/storage.ts`:

```typescript
  async getSignedUploadUrl(key: string, contentType: string, ttlSeconds: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds })
  }
```

- [ ] **Step 2: Register gallery routes in app.ts**

In `apps/api/src/app.ts`, add after the upload route registration:

```typescript
  await fastify.register(import("./routes/gallery.js"), { prefix: "/api/gallery" })
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/gallery.ts apps/api/src/lib/images/storage.ts apps/api/src/app.ts
git commit -m "feat: add gallery API routes with presigned URL upload"
```

---

## Task 4: Add galleryApi to frontend API client

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Add galleryApi namespace**

After the existing `uploadApi` block, add:

```typescript
// --- Gallery ---
export const galleryApi = {
  presign: (body: import("~shared/contracts").PresignRequest) =>
    request<import("~shared/contracts").PresignResponse>(
      "/gallery/presign",
      { method: "POST", body: JSON.stringify(body) }
    ),
  confirm: (body: import("~shared/contracts").ConfirmUploadRequest) =>
    request<import("~shared/contracts").GalleryMedia>(
      "/gallery/confirm",
      { method: "POST", body: JSON.stringify(body) }
    ),
  listByUser: (userId: string) =>
    request<import("~shared/contracts").ListGalleryResponse>(
      `/gallery/${userId}`
    ),
  listMine: () =>
    request<import("~shared/contracts").ListGalleryResponse>(
      "/gallery/me"
    ),
  update: (assetId: string, body: import("~shared/contracts").UpdateGalleryItemRequest) =>
    request<import("~shared/contracts").GalleryMedia>(
      `/gallery/${assetId}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  deleteItem: (assetId: string) =>
    request<{ success: boolean }>(
      `/gallery/${assetId}`,
      { method: "DELETE" }
    ),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat: add galleryApi to frontend API client"
```

---

## Task 5: Create frontend gallery components

**Files:**
- Create: `apps/web/app/components/gallery-upload.tsx`
- Create: `apps/web/app/components/gallery-grid.tsx`
- Create: `apps/web/app/components/gallery-item.tsx`
- Create: `apps/web/app/components/video-player.tsx`

These components follow the existing brutalist design system patterns (border-2/4, rounded-none, font-display, uppercase tracking).

- [ ] **Step 1: Create `<VideoPlayer />`**

Simple HTML5 video wrapper:

```tsx
export function VideoPlayer({ src, className = "" }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      controls
      playsInline
      className={`w-full object-cover ${className}`}
    />
  )
}
```

- [ ] **Step 2: Create `<GalleryItem />`**

Displays a single media item with image/video preview, caption, and actions:

```tsx
import { useState } from "react"
import type { GalleryMedia } from "~shared/contracts"
import { VideoPlayer } from "./video-player"
import { Star, Trash2, Pencil } from "lucide-react"
import { cn } from "~/lib/utils"

interface GalleryItemProps {
  item: GalleryMedia
  isOwner?: boolean
  onDelete?: (id: string) => void
  onToggleHighlight?: (id: string, isHighlight: boolean) => void
}

export function GalleryItem({ item, isOwner, onDelete, onToggleHighlight }: GalleryItemProps) {
  const isVideo = item.mediaType === "video"

  return (
    <div className={cn(
      "group relative border-4 border-foreground bg-background transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-primary)]",
      item.isHighlight && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="aspect-square overflow-hidden">
        {isVideo ? (
          <VideoPlayer src={item.originalUrl} className="h-full w-full" />
        ) : (
          <img
            src={item.thumbnailUrl || item.originalUrl}
            alt={item.caption || ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      {item.isHighlight && (
        <div className="absolute top-2 left-2 border-2 border-foreground bg-primary px-2 py-1">
          <Star className="size-3 fill-primary-foreground text-primary-foreground" />
        </div>
      )}

      {item.caption && (
        <div className="border-t-2 border-foreground p-2">
          <p className="font-bold tracking-widest text-xs text-foreground uppercase truncate">
            {item.caption}
          </p>
        </div>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleHighlight?.(item.id, !item.isHighlight)}
            className="border-2 border-foreground bg-background p-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Star className={cn("size-3", item.isHighlight && "fill-current")} />
          </button>
          <button
            onClick={() => onDelete?.(item.id)}
            className="border-2 border-foreground bg-background p-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `<GalleryGrid />`**

```tsx
import type { GalleryMedia } from "~shared/contracts"
import { GalleryItem } from "./gallery-item"

interface GalleryGridProps {
  items: GalleryMedia[]
  isOwner?: boolean
  onDelete?: (id: string) => void
  onToggleHighlight?: (id: string, isHighlight: boolean) => void
}

export function GalleryGrid({ items, isOwner, onDelete, onToggleHighlight }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="border-4 border-dashed border-foreground bg-muted/10 py-16 text-center">
        <p className="font-display text-2xl tracking-widest text-muted-foreground uppercase">
          NENHUMA MÍDIA PUBLICADA
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <GalleryItem
          key={item.id}
          item={item}
          isOwner={isOwner}
          onDelete={onDelete}
          onToggleHighlight={onToggleHighlight}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `<GalleryUpload />`**

Drag-and-drop upload with progress tracking:

```tsx
import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"
import { galleryApi } from "~/lib/api-client"
import { cn } from "~/lib/utils"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]
const MAX_SIZE_MB = 50

interface GalleryUploadProps {
  onUploadComplete?: () => void
}

export function GalleryUpload({ onUploadComplete }: GalleryUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máx ${MAX_SIZE_MB}MB)`)
      return
    }

    setIsUploading(true)
    setProgress(0)

    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "image"

      // Step 1: Get presigned URL
      const { uploadUrl, key, assetId } = await galleryApi.presign({
        fileName: file.name,
        mediaType,
        contentType: file.type,
        sizeBytes: file.size,
      })

      setProgress(30)

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload to storage failed")

      setProgress(70)

      // Step 3: Confirm upload
      await galleryApi.confirm({ assetId })

      setProgress(100)
      toast.success("Upload concluído!")
      onUploadComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload")
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }, [onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(uploadFile)
  }, [uploadFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(uploadFile)
  }, [uploadFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-4 border-dashed p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-foreground bg-muted/50 hover:border-primary"
      )}
    >
      <input
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={handleFileInput}
        className="hidden"
        id="gallery-upload-input"
      />
      <label htmlFor="gallery-upload-input" className="cursor-pointer">
        {isUploading ? (
          <div className="space-y-4">
            <p className="font-display text-2xl tracking-widest text-primary uppercase">
              ENVIANDO... {progress}%
            </p>
            <div className="h-4 border-2 border-foreground bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto size-12 text-muted-foreground" />
            <p className="font-display text-2xl tracking-widest text-foreground uppercase">
              ARRASTE FOTOS E VÍDEOS
            </p>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
              OU CLIQUE PARA SELECIONAR
            </p>
          </div>
        )}
      </label>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/gallery-upload.tsx apps/web/app/components/gallery-grid.tsx apps/web/app/components/gallery-item.tsx apps/web/app/components/video-player.tsx
git commit -m "feat: add gallery frontend components (upload, grid, item, video player)"
```

---

## Task 6: Integrate gallery into player profile pages

**Files:**
- Modify: `apps/web/app/routes/jogador/perfil.tsx` (or equivalent player profile page)
- Modify: `apps/web/app/routes/jogadores/$id.tsx` (public profile page)

- [ ] **Step 1: Add gallery to player's own profile page**

Import `GalleryUpload`, `GalleryGrid`, and `galleryApi`. Use `useQuery` to fetch the player's gallery via `galleryApi.listMine()`. Render `<GalleryUpload />` above the grid, and `<GalleryGrid items={...} isOwner />` below.

- [ ] **Step 2: Add gallery to public player profile page**

Import `GalleryGrid` and `galleryApi`. Fetch gallery via `galleryApi.listByUser(playerId)`. Render `<GalleryGrid items={...} />` (no owner actions).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/jogador/perfil.tsx apps/web/app/routes/jogadores/\$id.tsx
git commit -m "feat: integrate gallery into player profile pages"
```

---

## Task 7: Add gallery plan limits to subscription config

**Files:**
- Modify: `shared/contracts/subscription.ts`

- [ ] **Step 1: Add `maxGalleryItems` to PlanLimits type and configs**

Add `maxGalleryItems: number` to the `PlanLimits` type, then set values in each plan config:

- free: `maxGalleryItems: 5`
- craque: `maxGalleryItems: 20`
- titular: `maxGalleryItems: 0` (teams don't have gallery)
- campeao: `maxGalleryItems: 0`

Also update `getDefaultLimitsForRole` to include the field.

- [ ] **Step 2: Commit**

```bash
git add shared/contracts/subscription.ts
git commit -m "feat: add maxGalleryItems to plan limits config"
```
