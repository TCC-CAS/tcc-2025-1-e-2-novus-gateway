---
phase: 1
slug: foundation-database-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-01 | integration | `curl -s http://localhost:3000/health` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-01 | unit | `npx vitest run src/config` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | INFRA-02 | unit | `npx vitest run src/db/schema` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | INFRA-02 | integration | `npx drizzle-kit check` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/health.test.ts` — stubs for INFRA-01 health endpoint
- [ ] `src/__tests__/config.test.ts` — env validation tests for INFRA-01
- [ ] `src/__tests__/schema.test.ts` — schema shape tests for INFRA-02
- [ ] `vitest.config.ts` — test framework config
- [ ] `vitest` install — `npm install -D vitest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker Compose cold-start | INFRA-01 | Requires full Docker environment | `docker compose up --build` and verify all 3 containers start |
| Drizzle migrations on fresh DB | INFRA-02 | Requires running Postgres | `npx drizzle-kit migrate` against fresh container |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
