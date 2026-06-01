# Followers System & Image Upload — Design Spec

**Date:** 2026-05-06
**Project:** VárzeaPro
**Status:** Design Review

---

## Part 1: Followers System (Fix & Complete)

### Problems Identified

1. **Business Bug**: `favorites: 0` on both FREE and CRAQUE player plans — no player can follow anyone
2. **Race Condition**: SELECT-then-INSERT gap when creating favorites; constraint violation not handled
3. **Race Condition on Limits**: Count check and insert not atomic
4. **Hardcoded Counter**: `GET /usage` returns `favoritesUsed: 0` always
5. **N+1 Query**: Individual queries for each favorite's avatar/profile data
6. **No Pagination**: `GET /favorites` returns all rows unbounded
7. **No Real-time**: No socket events emitted on follow/unfollow
8. **No Optimistic UI**: Frontend waits for server response before updating button state
9. **Missing Index**: No dedicated index on `favorites.user_id`

### Solution Design

#### Database Changes

**New Migration `0002_followers`:**

```sql
-- Add dedicated index for count queries
CREATE INDEX "favorites_user_id_idx" ON "favorites" ("user_id");
```

#### Backend Changes

**File: `apps/api/src/routes/favorites.ts`** — Rewrite with:

1. **Transactional follow**: Wrap existence check + limit check + insert in a PostgreSQL transaction
2. **Constraint violation handling**: Catch unique index violation → return 409 with friendly message
3. **Pagination**: `GET /favorites?page=1&pageSize=20` with meta envelope
4. **Optimized query**: Use LEFT JOIN with players/teams in a single query instead of N+1
5. **Socket events**: Emit `follower_added` / `follower_removed` to the target user's room

**File: `apps/api/src/routes/subscription.ts`** — Fix:
- `GET /usage`: Replace `const favoritesUsed = 0` with actual `count(*)` query

**File: `apps/web/shared/contracts/subscription.ts`** — Fix plan limits:
- FREE: `favorites: 5` (was 0)
- CRAQUE: `favorites: 50` (was 0)
- TITULAR: `favorites: 50` (was 20)
- CAMPEAO: `favorites: UNLIMITED` (unchanged)

#### New Socket Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `follower_added` | Server → `user:{targetId}` | `{ followerId, followerName, followerRole }` | After successful follow insert |
| `follower_removed` | Server → `user:{targetId}` | `{ followerId }` | After successful unfollow delete |

#### Frontend Changes

**Files: `apps/web/app/routes/jogadores.$id.tsx` and `apps/web/app/routes/times.$id.tsx`**

1. **Optimistic update**: Update React Query cache immediately on button click; revert on error
2. **Socket listener**: Subscribe to real-time follower count changes
3. **Error recovery**: Retry button on network failure

#### Contract Changes

**File: `apps/web/shared/contracts/favorites.ts`** (new):
```ts
export type FavoriteItem = {
  id: string;
  targetUser: {
    id: string;
    name: string;
    role: "player" | "team";
    avatarUrl: string | null;
    profileId: string | null;
  };
  createdAt: string;
};

export type ListFavoritesResponse = {
  data: FavoriteItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
```

---

## Part 2: Image Upload System (Complete Implementation)

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                   ImageService                        │
│                                                       │
│  upload(file) ──► validate ──► process ──► store     │
│                                                       │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐          │
│  │Validator│   │Processor │   │Storage   │          │
│  │         │   │ (Sharp)  │   │(S3 SDK)  │          │
│  │magic    │   │resize    │   │presigned │          │
│  │bytes    │   │compress  │   │URLs      │          │
│  │MIME     │   │thumbnail │   │delete    │          │
│  │size     │   │WebP      │   │CDN-ready │          │
│  └─────────┘   └──────────┘   └──────────┘          │
└──────────────────────────────────────────────────────┘
```

Each module is independent, testable, and reusable. The `ImageService` orchestrates them.

### New Dependencies

**Backend (`apps/api/package.json`):**
- `@aws-sdk/client-s3` — S3-compatible storage (works with AWS, R2, MinIO)
- `@aws-sdk/s3-request-presigner` — Presigned URL generation
- `sharp` — Image processing (resize, compress, WebP conversion)
- `file-type` — Magic byte MIME detection

### Component Modules

#### `ImageValidator`

```ts
// apps/api/src/lib/images/validator.ts
class ImageValidator {
  validateMagicBytes(buffer: Buffer): Promise<{ mime: string; ext: string } | null>
  // Uses 'file-type' package to read actual magic bytes, not client-declared MIME
  // Returns null if unknown/unrecognized format
  
  isAllowedType(mime: string): boolean
  // Whitelist: image/jpeg, image/png, image/webp, image/avif
  
  isWithinSizeLimit(buffer: Buffer, maxBytes: number): boolean
}
```

#### `ImageProcessor`

```ts
// apps/api/src/lib/images/processor.ts
class ImageProcessor {
  async process(input: Buffer): Promise<ImageVariants>
  // Returns 3 sizes in WebP format:
  // - thumbnail: 150x150 cover
  // - medium: 500x500 inside
  // - original: max 2000px inside
  
  async toWebP(input: Buffer, options: ResizeOptions): Promise<Buffer>
  // Converts to WebP with quality 80
}
```

#### `ImageStorage`

```ts
// apps/api/src/lib/images/storage.ts
class ImageStorage {
  async upload(path: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<void>
  async delete(path: string): Promise<void>
  async getSignedUrl(path: string, ttlSeconds: number): Promise<string>
  async deletePrefix(prefix: string): Promise<void> // Delete all files under a prefix
}
```

#### `ImageService` (Orchestrator)

```ts
// apps/api/src/lib/images/service.ts
class ImageService {
  async uploadProfileImage(
    file: MultipartFile,
    userId: string,
    entityType: "player_avatar" | "team_logo",
    existingPath?: string
  ): Promise<ImageUploadResult>
  // 1. Read buffer from multipart
  // 2. Validate (magic bytes, MIME, size)
  // 3. Process (resize, compress, thumbnails)
  // 4. Store to S3
  // 5. Delete old images if existingPath
  // 6. Insert media_assets row
  // 7. Return URLs

  async deleteImage(assetId: string, userId: string): Promise<void>
  // Soft-delete: set is_deleted=true, delete from S3
}
```

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload/avatar` | Required | Upload/replace player avatar |
| `POST` | `/api/upload/logo` | Required | Upload/replace team logo |
| `DELETE` | `/api/upload/avatar` | Required | Remove player avatar |
| `DELETE` | `/api/upload/logo` | Required | Remove team logo |

### S3 Bucket Structure

```
varzeapro-media/
├── avatars/
│   └── {userId}/
│       ├── {uuid}-thumbnail.webp
│       ├── {uuid}-medium.webp
│       └── {uuid}-original.webp
├── logos/
│   └── {userId}/
│       ├── {uuid}-thumbnail.webp
│       ├── {uuid}-medium.webp
│       └── {uuid}-original.webp
```

### Environment Variables (new)

```env
# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=varzeapro-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=          # Optional CDN base URL
S3_USE_PATH_STYLE=false  # true for MinIO

# Image Processing
IMAGE_MAX_SIZE_MB=10
IMAGE_MAX_DIMENSION=4000
PRESIGNED_URL_TTL_SECONDS=3600

# Rate Limiting
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=60
```

### Database — New Table

```sql
CREATE TABLE "media_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL REFERENCES "users"("id"),
  "entity_type" text NOT NULL,  -- 'player_avatar', 'team_logo'
  "entity_id" text,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "thumbnail_url" text,
  "medium_url" text,
  "original_url" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX "media_assets_owner_idx" ON "media_assets" ("owner_user_id");
CREATE INDEX "media_assets_entity_idx" ON "media_assets" ("entity_type", "entity_id")
  WHERE "is_deleted" = false;
```

### Security Measures

1. **Magic Bytes Validation**: Server reads actual file bytes (via `file-type`), ignores client MIME
2. **File Size**: Enforced at Fastify multipart level + application level
3. **Rate Limiting**: Dedicated per-user limit on upload endpoints (10/hour default)
4. **Presigned URLs**: Private bucket — all access through time-limited presigned URLs
5. **UUID Filenames**: No user input in filenames — prevents path traversal
6. **Content-Type Validation**: Whitelist only image/jpeg, image/png, image/webp, image/avif
7. **Dimension Limit**: Reject images > 4000px in any dimension
8. **Metadata Stripping**: Sharp strips EXIF data by default on resize
9. **Soft Delete**: Database rows marked deleted, not removed
10. **Ownership Check**: Only the owner can delete/replace their images

### Frontend Components

#### `ImageUpload` Component

```tsx
// apps/web/app/components/image-upload.tsx
<ImageUpload
  currentUrl={profile.photoUrl}
  entityType="player_avatar"
  onUploadComplete={(urls) => {}}
  onError={(error) => {}}
/>
```

Features:
- Drag and drop zone (native HTML5 DnD API, no extra dependency)
- Click to browse
- Instant client-side preview via ObjectURL
- Upload progress bar
- Loading spinner during upload
- Error state with retry button
- Size validation before upload (client-side pre-check)
- Type validation before upload (extension whitelist)
- Responsive: works on mobile and desktop

#### `OptimizedImage` Component

```tsx
// apps/web/app/components/optimized-image.tsx
<OptimizedImage
  src={urls.medium}
  thumbnailSrc={urls.thumbnail}
  alt="Foto do jogador"
  size="md"  // 'sm' | 'md' | 'lg' — picks default src
  fallback={<UserIcon />}
/>
```

Features:
- Lazy loading (`loading="lazy"`)
- `srcset` with thumbnail/medium/original for responsive
- Skeleton placeholder while loading
- Fallback icon if image fails to load
- Object-fit cover/contain

### Existing Code to Remove

1. `apps/api/src/routes/upload.ts` — Replaced by S3-based upload routes
2. `apps/api/src/app.ts` line 34-37 — Remove `@fastify/static` for uploads (no longer serving local files)
3. `apps/api/src/app.ts` line 40-42 — Keep `@fastify/multipart` (still needed)

### Implementation Order

1. **Phase 1 — Followers Fix** (critical business bug)
   - Fix plan limits
   - Add database index
   - Rewrite favorites route with transactions
   - Fix usage counter
   - Add pagination
   - Optimize query with JOINs
   - Add socket events
   - Frontend optimistic updates

2. **Phase 2 — Image Infrastructure**
   - Install S3 SDK + Sharp + file-type
   - Create ImageValidator, ImageProcessor, ImageStorage
   - Create ImageService orchestrator
   - Create DB migration for media_assets
   - Create new upload routes
   - Add environment variables

3. **Phase 3 — Image Frontend**
   - Create ImageUpload component
   - Create OptimizedImage component
   - Integrate into profile edit pages
   - Integrate into profile view pages

---

## Overall Project Recommendations (from analysis)

These are fixes that should be done but are separate from the two main tasks:

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | CORS wildcard in socket.io | Enforce `CORS_ORIGIN` without fallback |
| P0 | SessionStorage JWT token | Remove from sessionStorage, use HttpOnly cookie only |
| P1 | Dual DB connections | Unify into single connection pool from `plugins/db.ts` |
| P1 | Auth proxy pattern | Replace with direct export after app initialization |
| P1 | No cache headers | Add Cache-Control to profile/list endpoints |
| P1 | Missing indexes | Add indexes on `messages.sender_id`, `messages.created_at` |
| P2 | Contract import path | Extract `shared/` to workspace root as proper package |
| P2 | N+1 in search routes | Verify search routes don't have similar N+1 patterns |
| P2 | Error logging in prod | Sanitize error logs to exclude stack traces |
