---
phase: 4
slug: search-subscriptions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (verify exists from Phase 3; Wave 0 creates if missing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | SRCH-01, SRCH-02 | stub | `npx vitest run src/tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | SUB-01, SUB-02, SUB-03 | stub | `npx vitest run src/tests/subscription.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | SRCH-01 | integration | `npx vitest run src/tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | SRCH-02 | integration | `npx vitest run src/tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | SUB-01 | integration | `npx vitest run src/tests/subscription.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 1 | SUB-02 | integration | `npx vitest run src/tests/subscription.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-03 | 03 | 1 | SUB-03 | integration | `npx vitest run src/tests/subscription.test.ts` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 2 | SUB-03 | integration | `npx vitest run src/tests/subscription.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/search.test.ts` — stubs for SRCH-01, SRCH-02 (player search, team search)
- [ ] `src/tests/subscription.test.ts` — stubs for SUB-01, SUB-02, SUB-03 (usage, upgrade, plan gate)
- [ ] `vitest.config.ts` — verify exists from Phase 3; create if missing

*Wave 0 must create all missing test files before any implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plan-gated endpoints return 403 with correct error shape | SUB-03 | Requires authenticated user with specific plan + real DB | POST to plan-gated endpoint with free-tier token; assert HTTP 403 + `{ error: { code: "PLAN_LIMIT_EXCEEDED" } }` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
