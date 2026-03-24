# Project State: VarzeaPro Backend

**Last updated:** 2026-03-23
**Milestone:** M1 — Backend v1

---

## Project Reference

**Core value:** Players and teams find each other fast — every other feature (subscriptions, moderation, admin) exists to make that discovery trustworthy and sustainable.

**Current focus:** Phase 1 — Foundation + Database Schema

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 — Foundation + Database Schema |
| Plan | None started |
| Status | Not started |
| Phase goal | Fastify server running with full Drizzle schema and Docker environment |

**Overall progress:**
```
Phase 1 [ ] Phase 2 [ ] Phase 3 [ ] Phase 4 [ ] Phase 5 [ ] Phase 6 [ ] Phase 7 [ ]
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 7 |
| Phases complete | 0 |
| Plans written | 0 |
| Plans complete | 0 |
| Requirements mapped | 27/27 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Fastify 5.x + TypeScript strict | Non-negotiable per PROJECT.md constraints |
| Drizzle ORM over Prisma | Pure TS, no codegen, SQL-transparent |
| Better Auth 1.5.6 | Built-in RBAC, Fastify integration, DB-backed sessions |
| Socket.io 4.8.3 via fastify-socket.io | Room management, shared http.Server port |
| Zod via fastify-type-provider-zod | Reuses frontend shared contracts — no schema duplication |
| HttpOnly cookies for auth | sessionStorage JWT in frontend is XSS risk — backend corrects this |
| Full DB schema in Phase 1 | Retrofitting Drizzle schema disrupts all downstream services |
| Security in every phase | Pitfalls 1, 2, 4 cannot be retrofitted — address at first occurrence |

### Todos

- [ ] Verify `fastify-better-auth` community plugin maintenance status before Phase 2
- [ ] Coordinate frontend `api-client.ts` migration from `Authorization: Bearer` to `credentials: 'include'` with Phase 2 delivery
- [ ] Decide whether to move shared contracts to `packages/shared` in Phase 1 or defer

### Blockers

None.

### Notes

- Frontend (`apps/web`) is 100% complete — do not modify frontend code unless fixing a contract mismatch
- Backend responses must match `~shared/contracts` exactly: `{ data: T }` for single items, `{ data: T[], meta: { page, pageSize, total, totalPages } }` for lists
- Research confidence: HIGH across all areas (stack, features, architecture, pitfalls)
- Research flags: Phase 2 (Better Auth bearer+cookie with Fastify 5), Phase 4 (Socket.io `io.use()` + fastify-socket.io lifecycle)

---

## Session Continuity

**To resume:** Start with `/gsd:plan-phase 1`

**Context:** Roadmap created. No plans written yet. All 27 requirements mapped across 7 phases. Research complete with HIGH confidence. Ready to begin Phase 1 planning.

---
*State initialized: 2026-03-23*
