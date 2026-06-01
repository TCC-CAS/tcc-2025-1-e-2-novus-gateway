# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5.9 - All application code (`Projeto/apps/web/app/`, `Projeto/apps/web/mocks/`)

**Secondary:**
- CSS (via Tailwind CSS v4) - Styling, entry in `Projeto/apps/web/app/app.css`

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Specified in `Projeto/apps/web/Dockerfile`

**Package Manager:**
- Bun (primary dev) - `Projeto/apps/web/bun.lock` present
- npm (Docker/CI) - Dockerfile uses `npm ci`
- Lockfile: `bun.lock` present (bun), `package-lock.json` referenced in Dockerfile

## Frameworks

**Core:**
- React 19.2 - UI component rendering (`Projeto/apps/web/app/`)
- React Router 7.12 - SSR-enabled full-stack routing framework (`Projeto/apps/web/react-router.config.ts`)
  - SSR mode enabled (`ssr: true`)
  - Served via `@react-router/serve` in production

**Build/Dev:**
- Vite 7.1 - Dev server and bundler (`Projeto/apps/web/vite.config.ts`)
- `@react-router/dev` 7.12 - React Router Vite plugin
- `@tailwindcss/vite` 4.1 - Tailwind CSS Vite integration
- `vite-tsconfig-paths` 5.1 - TypeScript path alias resolution in Vite

**Testing/Mocking:**
- MSW (Mock Service Worker) 2.12 - Browser API mocking in dev/test (`Projeto/apps/web/mocks/`)

## Key Dependencies

**UI Components:**
- `shadcn` 3.8 (CLI) + `radix-ui` 1.4 + `@base-ui/react` 1.2 - Headless component primitives
  - Config: `Projeto/apps/web/components.json`, style: "new-york", base color: slate
- `lucide-react` 0.563 - Icon library
- `tailwind-merge` 3.4 + `clsx` 2.1 + `class-variance-authority` 0.7 - Conditional class utilities
- `tw-animate-css` 1.4 - Animation utilities
- `next-themes` 0.4 - Theme switching (light/dark)

**Forms & Validation:**
- `react-hook-form` 7.71 - Form state management
- `@hookform/resolvers` 5.2 - Validation resolver bridge
- `zod` 4.3 - Schema validation and type inference

**Data Fetching:**
- `@tanstack/react-query` 5.90 - Server state management and caching

**UI Widgets:**
- `recharts` 2.15 - Charting and data visualization
- `embla-carousel-react` 8.6 - Carousel component
- `react-day-picker` 9.13 - Date picker
- `react-resizable-panels` 4 - Resizable panel layouts
- `vaul` 1.1 - Drawer/sheet component
- `cmdk` 1.1 - Command palette
- `input-otp` 1.4 - OTP input
- `sonner` 2.0 - Toast notifications
- `date-fns` 4.1 - Date utility library

**Server/Infra:**
- `isbot` 5.1 - Bot detection (SSR use)

## Configuration

**Environment:**
- Configured via `.env` files (`.env.example` at `Projeto/apps/web/.env.example`)
- `VITE_API_URL` - Backend API base URL (defaults to `/api` if unset)
- `VITE_USE_MOCK` - Toggle MSW mock API (`"true"` to force mock, `"false"` to disable in dev)

**Build:**
- `Projeto/apps/web/vite.config.ts` - Vite build config
- `Projeto/apps/web/react-router.config.ts` - React Router SSR config
- `Projeto/apps/web/tsconfig.json` - TypeScript config
  - Target: ES2022, strict mode enabled
  - Path aliases: `~/*` → `./app/*`, `~shared/*` → `./shared/*`

**Component Library:**
- `Projeto/apps/web/components.json` - shadcn/ui configuration

## Platform Requirements

**Development:**
- Node.js 20+ or Bun runtime
- Run: `bun run dev` (or `npm run dev`)

**Production:**
- Docker image based on `node:20-alpine`
- Multi-stage build: install deps → build → serve
- Serve command: `react-router-serve ./build/server/index.js`
- Container build defined at `Projeto/apps/web/Dockerfile`

---

*Stack analysis: 2026-03-23*
