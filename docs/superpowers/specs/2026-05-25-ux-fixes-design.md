# UX Fixes — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

---

## Overview

Three independent UX/session fixes for the VarzeaPro PWA:

1. **Landing page bottom nav** — `/` has no mobile navigation; PWA users get stranded without nav when not logged in.
2. **PWA session persistence** — `sessionStorage` is cleared when app is closed; users lose session on every PWA relaunch.
3. **Messages screen UX** — message content rendered in uppercase + tracking-widest makes text hard to read; layout issues.

---

## 1. Landing Page Bottom Nav

**Problem:** The public landing page (`/`) uses its own header with logo + Login/Cadastro buttons. On mobile/PWA there's no bottom nav, making navigation awkward.

**Constraint:** Keep the existing top bar exactly as-is. Only add a bottom nav for mobile (`md:hidden`).

**Solution:** Add a `<PublicNav>` component in `_index.tsx` (or extracted to `components/public-nav.tsx`) that renders the same brutalist bottom nav style as AppShell's mobile nav but with public items.

**Nav items:**
| Label | Href | Icon |
|-------|------|------|
| Início | `/` | `home` |
| Planos | `/planos` | `zap` |
| Entrar | `/login` | `log-in` |
| Cadastrar | `/cadastro` | `user-plus` |

**Visual spec:** Same classes as AppShell bottom nav — `fixed bottom-0`, `border-t-4 border-foreground`, `h-16`, active state `bg-foreground text-background`.

---

## 2. PWA Session Persistence

**Problem:** `app/lib/auth/session.ts` stores the `SessionUser` object in `sessionStorage`, which is wiped when the PWA is backgrounded/closed on mobile.

**Solution:** Replace `sessionStorage` with `localStorage` in all three functions (`getStoredUser`, `setStoredUser`, `clearStoredUser`). The actual auth is handled by HttpOnly cookies (Better Auth) — this cache is only for the UI. Logout already calls `clearStoredUser()` which will clear localStorage correctly.

**Security note:** Only the non-sensitive `SessionUser` object (id, name, role, planId) is stored. No tokens or secrets.

---

## 3. Messages Screen UX

**Affects:** `routes/jogador/mensagens.tsx` and `routes/time/mensagens.tsx` (same fixes both).

**Problems & fixes:**

| Problem | Fix |
|---------|-----|
| `uppercase` on message `<p>` content | Remove `uppercase` class from message body `<p>` |
| `tracking-widest` on message content | Remove `tracking-widest` from message body `<p>` |
| Text potentially overflowing bubble | Add `break-words` to message bubble `<div>` |
| Input placeholder in ALL CAPS | Change to `"Digite sua mensagem..."` |
| Timestamp also in uppercase/tracking | Remove `uppercase` + `tracking-widest` from timestamp `<p>` |
| Max-width of bubbles | Keep at `max-w-[75%]` (minor, already acceptable) |

**Preserve:** All section headers (`RESENHA`, `MENSAGENS DIRETAS`, contact name) keep uppercase — that's intentional brutalist style. Only the actual message text body loses uppercase.
