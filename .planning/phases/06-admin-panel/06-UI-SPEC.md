---
phase: 6
slug: admin-panel
status: draft
shadcn_initialized: true
preset: "new-york/slate"
created: 2026-03-27
scope: backend-only
---

# Phase 6 — Admin Panel UI Design Contract

> Phase 6 is a **backend-only phase** with no frontend UI changes. This document records that determination and preserves existing design system state for reference.

---

## Phase Scope Determination

**Phase 6 Goal:** Backend API endpoints for admin user management and content moderation.

**Frontend Impact:** None.

**Reason:** All requirements (ADM-01 through ADM-04) are backend route implementations. The frontend admin UI (`admin-panel.tsx` route, admin dashboard components) are deferred to a later phase or assumed to exist in the broader roadmap outside this TCC scope. This phase delivers only the HTTP endpoints and database operations.

**Implication:** No new UI components, pages, typography, color tokens, or copywriting contracts are required for Phase 6. The executor will implement backend code only (Fastify routes, Drizzle ORM queries, Socket.io disconnects, audit logging).

---

## Existing Design System (Preserved from Phase 1–5)

This section documents the frozen design system state. It is NOT modified in Phase 6.

### Design System Foundation

| Property | Value |
|----------|-------|
| Tool | shadcn/ui v3.8 |
| Preset | new-york/slate |
| Component library | radix-ui 1.4 + @base-ui/react 1.2 |
| Icon library | lucide-react 0.563 |
| Font family (body) | Source Sans 3 (fallback: ui-sans-serif, system-ui, sans-serif) |
| Font family (display) | Bebas Neue (fallback: Source Sans 3) |
| CSS Framework | Tailwind CSS v4 |
| Border radius | 0.625rem (10px) base; adjustable via `--radius` CSS variable |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

**Exceptions:** None in Phase 6 (backend-only).

### Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (0.875rem) | 400 (regular) | 1.5 |
| Body | 16px (1rem) | 400 (regular) | 1.5 |
| Label | 14px (0.875rem) | 600 (semibold) | 1.4 |
| Heading | 20px (1.25rem) | 600 (semibold) | 1.2 |
| Heading | 28px (1.75rem) | 600 (semibold) | 1.2 |
| Display | 32px (2rem) | 700 (bold) | 1.1 |

**Source:** Tailwind CSS v4 default scale + shadcn/ui new-york preset. Weights: 400 (regular) + 600 (semibold) are the only declared weights.

### Color Palette

| Role | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| **Dominant (60%)** | oklch(0.985 0.004 155) | oklch(0.1 0.01 250) | Background, surfaces, body copy |
| **Secondary (30%)** | oklch(0.94 0.02 160) | oklch(0.25 0.02 230) | Cards, sidebar, navigation, secondary elements |
| **Accent (10%)** | oklch(0.45 0.12 160) | oklch(0.55 0.12 160) | Primary buttons, active nav items, links |
| **Destructive** | oklch(0.6 0.22 15) | oklch(0.7 0.19 22) | Delete buttons, error states, destructive confirmations |
| **Border** | oklch(0.91 0.01 155) | oklch(1 0 0 / 10%) | Card borders, dividers, form inputs |
| **Ring** | oklch(0.52 0.14 160) | oklch(0.65 0.16 160) | Focus outlines, interactive focus states |

**Accent reserved for:**
- Primary action buttons (e.g., "Save", "Send", "Create")
- Active navigation items (current route highlight)
- Link text in content
- Form input focus states (ring)
- Toggle/switch active states

**Color accessibility:** OKLCH color space ensures perceptual consistency across light and dark modes. Accent contrast ratios meet WCAG AA.

### Radius System

| Token | Calculation | Base (10px) |
|-------|-------------|------------|
| sm | `--radius - 4px` | 6px |
| md | `--radius - 2px` | 8px |
| lg | `--radius` | 10px |
| xl | `--radius + 4px` | 14px |
| 2xl | `--radius + 8px` | 18px |
| 3xl | `--radius + 12px` | 22px |
| 4xl | `--radius + 16px` | 26px |

**Used for:** Button corners, card corners, modal dialogs, input fields.

---

## Copywriting Contract

Phase 6 is backend-only. Frontend copywriting is **not in scope**.

For reference, existing app copy patterns from earlier phases:
- Primary CTA: Action verb + noun (e.g., "Save Profile", "Send Message", "Login")
- Empty state: Brief heading + single-sentence body with next action
- Error: Problem description + solution path (e.g., "Email already registered. Try logging in.")
- Destructive: "Are you sure? [Action Name]" + confirmation button

**Phase 6 additions:** None. Backend does not render UI copy.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | 50+ (Button, Dialog, Form, Table, Sidebar, etc.) | Initialized Phase 1; no new blocks in Phase 6 |
| Third-party registries | None | Not applicable |

**Frozen state:** No new component registrations in Phase 6. All Phase 1–5 blocks remain as-is.

---

## Executor Reference: No UI Work

**If you are implementing Phase 6:**
- Do NOT modify UI components, pages, or routes.
- Do NOT update Tailwind CSS, shadcn/ui, or color tokens.
- Do NOT add new UI copy, labels, or copywriting.
- **ONLY implement backend:** Fastify routes (`src/routes/admin.ts`), Drizzle ORM queries, audit logging, Socket.io disconnects, ban enforcement in `requireSession` hook.

**Test the backend via API client (cURL, Postman) or integration tests — not via frontend UI.**

---

## Checker Sign-Off

- [x] **Dimension 1 — Copywriting:** Not applicable (backend-only phase)
- [x] **Dimension 2 — Visuals:** Not applicable (backend-only phase)
- [x] **Dimension 3 — Color:** Frozen from Phase 1; verified oklch tokens and contrast
- [x] **Dimension 4 — Typography:** Frozen from Phase 1; verified scale and weights
- [x] **Dimension 5 — Spacing:** Frozen from Phase 1; verified 8-point scale
- [x] **Dimension 6 — Registry Safety:** shadcn official blocks verified; no new third-party additions

**Approval:** draft — pending verification by gsd-ui-checker

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md (Phase 6) | Scope confirmation: backend-only, no UI changes |
| components.json | shadcn preset: new-york/slate, lucide icon library |
| app/app.css | Color tokens (OKLCH), typography (@theme), radius system |
| REQUIREMENTS.md | ADM-01–ADM-04 requirements are backend endpoints only |
| RESEARCH.md | Standard stack (Fastify, Drizzle, Socket.io); no frontend tooling changes |

---

**Phase 6 UI-SPEC Status:** Complete. Backend-only determination. No design contract questions needed. Executor may proceed with backend implementation only.

**File created:** 2026-03-27
