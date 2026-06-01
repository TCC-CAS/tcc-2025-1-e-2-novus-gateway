# VarzeaPro — Implementation Plan Design

> Date: 2026-05-12
> Branch: `dev`
> Approach: Parallel tracks (3 trilhas)
> Deadline: No fixed deadline

---

## Overview

Implementation plan covering 8 bugs, player gallery, MercadoPago sandbox payments, Resend email integration, and AWS deployment. Organized into 3 parallel tracks that can progress independently.

---

## Track 1: Backend Core

### Phase 1A — Bug Fixes (2-3 days)

**BUG-01/08: Position filter not applied in player search**

- File: `apps/api/src/routes/search.ts`
- Fix: Add `position` to destructuring and append SQL filter using `@>` (array contains)
- `positions` is `text[]` in DB, so: `sql\`${players.positions} @> ARRAY[${position}]::text[]\``

**BUG-02: Region filter impossible for players**

- Add columns `region` (text) and `city` (text) to `players` table via Drizzle migration
- Update `apps/api/src/db/schema/players.ts`
- Update `shared/contracts/players.ts`: add to `PlayerProfileSchema`, `PlayerSummarySchema`, `UpsertPlayerProfileRequestSchema`
- Add `ilike` filter in `search.ts`: `if (region) filters.push(ilike(players.region, \`%${region}%\`))`

**BUG-03/07: Player level field missing**

- Add column `level` (text) to `players` table — reuses the same `TeamLevelSchema` values: amador/recreativo/semi-profissional/outro
- This enables matching player level to team level in search
- Add to onboarding (`apps/web/app/routes/onboarding.tsx`) step 2: Select with level options
- Add to profile edit (`apps/web/app/routes/jogador/perfil-editar.tsx`)
- Add level filter in player search (teams can filter by player level)

**BUG-04: No smart default filter for player-to-team search**

- File: `apps/web/app/routes/jogador/buscar-times.tsx`
- When page loads, fetch current player positions and pre-set `openPosition` filter
- Not blocking — user can clear the filter — but suggests relevant positions

**BUG-05: Hardcoded "SEM REGIÃO DEFINIDA"**

- File: `apps/web/app/routes/time/buscar-jogadores.tsx`
- Replace hardcoded text with actual `region` field from player data
- Depends on BUG-02 (column must exist first)

**BUG-06: No visual highlight for matched open position**

- File: `apps/web/app/routes/jogador/buscar-times.tsx`
- When `openPosition` filter is active, highlight matching position badges in team cards
- CSS change only — add conditional styling based on filter match

**Migration:** New migration `0004_add_player_region_city_level.sql`:
```sql
ALTER TABLE players ADD COLUMN region text;
ALTER TABLE players ADD COLUMN city text;
ALTER TABLE players ADD COLUMN level text;
```

**Tests to update:**
- `apps/api/tests/routes/search.test.ts` — add test cases for position, region, level filters
- `apps/api/tests/schema.test.ts` — validate new columns

---

### Phase 1B — Player Gallery (4-5 days)

**Architecture: Presigned URL Direct Upload**

Flow:
1. Frontend calls `POST /api/gallery/presign` with file metadata
2. Backend generates presigned PUT URL for S3, returns `{ uploadUrl, key, assetId }`
3. Frontend uploads file directly to S3 using presigned URL
4. Frontend calls `POST /api/gallery/confirm` with assetId and metadata
5. Backend verifies upload exists in S3, saves record to DB

**Database:** New table `gallery_media`:
- id (text PK)
- ownerUserId (FK → users)
- mediaType (text: "image" | "video")
- storageKey (text: "gallery/{userId}/{uuid}")
- fileName, mimeType, sizeBytes
- width, height (images)
- durationSeconds (videos)
- caption, isHighlight, sortOrder
- thumbnailUrl, mediumUrl, originalUrl (presigned GET URLs)
- isDeleted, deletedAt (soft delete)
- createdAt, updatedAt

**API Routes (6 endpoints):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/gallery/presign | player | Generate presigned PUT URL |
| POST | /api/gallery/confirm | player | Confirm upload, save metadata |
| GET | /api/gallery/:userId | public | List public gallery |
| GET | /api/gallery/me | player | List own gallery |
| PUT | /api/gallery/:assetId | owner | Update caption/highlight/order |
| DELETE | /api/gallery/:assetId | owner | Soft delete + S3 delete |

**Shared Contract:** New file `shared/contracts/gallery.ts`:
- `GalleryMediaTypeSchema` (z.enum)
- `GalleryMediaSchema`
- `PresignRequestSchema`, `PresignResponseSchema`
- `ConfirmUploadSchema`
- `UpdateGalleryItemSchema`
- `ListGalleryResponseSchema`

**Plan gating:**
- `videoHighlights` feature flag in plan config → only CRAQUE+ can upload videos
- `maxGalleryItems()` → FREE: 5, CRAQUE: 20
- Check limits in presign endpoint before generating URL

**Frontend components (4):**
- `<GalleryUpload />` — Drag-and-drop zone, file type/size validation, progress bar, multi-file support
- `<GalleryGrid />` — Responsive grid with lazy loading, infinite scroll
- `<GalleryItem />` — Card with image/video preview, caption, highlight badge, delete/edit actions
- `<VideoPlayer />` — HTML5 video element with controls

**Integration points:**
- Player profile page (`/jogadores/:id`) — show public gallery
- Player own profile (`/jogador/perfil`) — manage gallery with upload

**Rate limiting:** Gallery upload rate-limited (e.g., 20 uploads/hour)

---

### Phase 1C — MercadoPago Sandbox Payment (3-4 days)

**Architecture:**

```
Frontend → POST /api/subscription/checkout { planId }
         → Backend creates MP Preference
         → Returns { initPoint (checkout URL) }

Frontend → Redirect to initPoint
         → User pays in MP sandbox

MP → POST /api/webhooks/mercadopago (IPN)
   → Backend fetches payment status from MP
   → Updates subscription + user.planId in DB
```

**New dependencies:** `mercadopago` npm package

**Environment variables:**
- `MERCADOPAGO_ACCESS_TOKEN` (sandbox token)
- `MERCADOPAGO_PUBLIC_KEY` (frontend, for card tokenization if needed)
- `MERCADOPAGO_WEBHOOK_URL`

**API changes:**
- `POST /api/subscription/checkout` — New endpoint, creates Preference, returns checkout URL
- `POST /api/webhooks/mercadopago` — New endpoint, handles IPN notifications
- Modify `POST /api/subscription/upgrade` — Deprecate or keep for admin bypass
- `GET /api/subscription/usage` — No changes

**Shared contract:** New file `shared/contracts/payment.ts`:
- `CheckoutRequestSchema` (planId)
- `CheckoutResponseSchema` (initPoint, preferenceId)
- `WebhookPayloadSchema` (MP IPN payload shape)

**Frontend changes:**
- Planos page (`/planos`) — Connect "Assinar" buttons to checkout flow
- Checkout redirect — Simple redirect to MP init_point
- Success/cancel pages — After payment, redirect back
- `subscriptionApi.checkout(planId)` — New API client method

**Sandbox setup:**
- Create MP sandbox account at https://www.mercadopago.com.br/developers/
- Get sandbox credentials
- Test with MP test users and test cards

---

### Phase 1D — Email + Verification (2-3 days)

**Email provider:** Resend (resend.com)
**Library:** `resend` npm package

**Abstraction:** `apps/api/src/lib/email/service.ts`
```typescript
interface EmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
  sendWelcome(to: string, name: string): Promise<void>
}
```

**Templates:** 3 email templates (HTML)
1. Password reset — link with token, expires in 1h
2. Email verification — link with token, verify email ownership
3. Welcome — onboarding encouragement after signup

**Environment variable:** `RESEND_API_KEY`

**Better Auth integration:**
- Enable `emailVerification` plugin in `apps/api/src/lib/auth.ts`
- Configure `sendVerificationEmail` callback to use EmailService
- Add verification callback route
- Frontend: Show "verify your email" screen after signup if not verified

**Replace console.log:**
- Find all `console.log` email sends in auth flows
- Replace with `emailService.sendPasswordReset()` etc.

---

## Track 2: Infrastructure (AWS Deploy)

### Phase 2A — AWS Provisioning (1 day)

- Create AWS account + IAM user (`varzeapro-deploy`)
- Create S3 bucket (`varzeapro-media`, sa-east-1, CORS configured)
- Provision EC2 (t3.medium, Ubuntu 24.04, security group with 22/80/443)
- Create IAM role for EC2 (S3 access without hardcoded credentials)

### Phase 2B — Production Docker Compose (1 day)

**New file: `docker-compose.prod.yml`**

Services:
- `postgres` — PostgreSQL 18.3, healthcheck, persistent volume, no external port
- `api` — Builds from `./apps/api`, depends on postgres, env_file, port 3000
- `web` — Builds from `./apps/web`, depends on api, port 3001 (different from api)

Volumes: `postgres_data`, `uploads_data`

### Phase 2C — Nginx + HTTPS (1 day)

**Nginx reverse proxy config:**
- `seudominio.com` → proxy to web container (port 3001)
- `api.seudominio.com` → proxy to api container (port 3000)
- `/socket.io/` → WebSocket upgrade headers
- `client_max_body_size 12M` for uploads

**HTTPS:** certbot with Let's Encrypt for both domains
- Auto-renewal via cron

### Phase 2D — DNS + Deploy Script (0.5 day)

- DNS A records pointing to EC2 IP
- `deploy.sh` script: git pull → docker compose up --build → run migrations → prune old images

**Estimated cost:** ~$34/month (EC2 t3.medium + EBS + S3 + Route 53)

---

## Track 3: Polish (Lower Priority)

These can be tackled after Tracks 1 and 2 are stable:

- FEAT-06: Notification system (in-app bell icon, DB table, Socket.io push)
- FEAT-07: Upload pipeline tests
- FEAT-08: CI/CD with GitHub Actions
- FEAT-09: MSW handlers for frontend dev
- FEAT-10: Connected planos page
- FEAT-11-14: OG tags, rate limit feedback, advanced filters, settings page

---

## Execution Order (Recommended)

```
Week 1-2:  Track 1 Phase 1A (Bugs) + Track 2 Phase 2A (AWS Provisioning)
Week 2-3:  Track 1 Phase 1B (Gallery) + Track 2 Phase 2B-2C (Docker + Nginx)
Week 3-4:  Track 1 Phase 1C (MercadoPago) + Track 2 Phase 2D (DNS + Deploy)
Week 4-5:  Track 1 Phase 1D (Emails) + Track 3 (Polish)
```

Tracks 1 and 2 can run in parallel. Track 3 starts after Track 1 is stable.

---

## Skills to Leverage

Per phase, these skills from the plugin ecosystem can assist:

| Phase | Relevant Skills |
|-------|----------------|
| 1A (Bugs) | `debugging-strategies`, `drizzle-orm-expert`, `zod-validation-expert` |
| 1B (Gallery) | `file-uploads`, `frontend-design:frontend-design`, `drizzle-orm-expert` |
| 1C (MercadoPago) | `payment-integration`, `api-patterns` |
| 1D (Emails) | `email-systems`, `backend-dev-guidelines` |
| 2 (AWS Deploy) | `docker-expert`, `deployment-engineer`, `aws-skills` |

---

## Files to Create

| File | Phase |
|------|-------|
| `shared/contracts/gallery.ts` | 1B |
| `shared/contracts/payment.ts` | 1C |
| `apps/api/src/routes/gallery.ts` | 1B |
| `apps/api/src/db/schema/gallery-media.ts` | 1B |
| `apps/api/src/routes/webhooks/mercadopago.ts` | 1C |
| `apps/api/src/lib/email/service.ts` | 1D |
| `apps/api/src/lib/email/templates/` | 1D |
| `apps/web/app/components/gallery-upload.tsx` | 1B |
| `apps/web/app/components/gallery-grid.tsx` | 1B |
| `apps/web/app/components/gallery-item.tsx` | 1B |
| `apps/web/app/components/video-player.tsx` | 1B |
| `docker-compose.prod.yml` | 2B |
| `deploy.sh` | 2D |

## Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `apps/api/src/db/schema/players.ts` | 1A | Add region, city, level columns |
| `apps/api/src/db/schema/index.ts` | 1B | Export gallery_media |
| `apps/api/src/routes/search.ts` | 1A | Add position and region filters |
| `shared/contracts/players.ts` | 1A | Add region, city, level to schemas |
| `shared/contracts/search.ts` | 1A | No changes needed (already has fields) |
| `apps/web/app/routes/onboarding.tsx` | 1A | Add level, region, city fields |
| `apps/web/app/routes/jogador/perfil-editar.tsx` | 1A | Add level, region, city fields |
| `apps/web/app/routes/time/buscar-jogadores.tsx` | 1A | Use real region, remove hardcoded |
| `apps/web/app/routes/jogador/buscar-times.tsx` | 1A | Pre-filter by player positions |
| `apps/api/src/routes/subscription.ts` | 1C | Add checkout endpoint |
| `apps/api/src/lib/auth.ts` | 1D | Enable emailVerification |
| `apps/web/app/routes/planos.tsx` | 1C | Connect to checkout flow |
