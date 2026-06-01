---
phase: 6
slug: admin-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | Projeto/apps/api/vitest.config.ts |
| **Quick run command** | `cd Projeto/apps/api && npm run test:unit -- --run` |
| **Full suite command** | `cd Projeto/apps/api && npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd Projeto/apps/api && npm run test:unit -- --run`
- **After every plan wave:** Run `cd Projeto/apps/api && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | ADM-01, ADM-02, ADM-03, ADM-04 | integration | `npm run test -- routes/admin.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | ADM-01 | integration | `npm run test -- routes/admin.test.ts -t "list users\|user detail"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | ADM-02 | integration | `npm run test -- routes/admin.test.ts -t "ban user"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | ADM-03 | integration | `npm run test -- routes/admin.test.ts -t "list reports"` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | ADM-04 | integration | `npm run test -- routes/admin.test.ts -t "moderate report"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Projeto/apps/api/src/routes/admin.test.ts` — stubs for ADM-01 through ADM-04
- [ ] `Projeto/apps/api/src/hooks/require-auth.test.ts` — ban status enforcement tests
- [ ] Fixtures: `adminUser`, `bannedUser`, `reports`, `moderation fixtures` in test setup

*Existing infrastructure covers test framework and config; Wave 0 adds phase-specific test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Socket.io force disconnect on ban | ADM-02 | Real WebSocket lifecycle hard to test in Vitest integration | Connect socket as user, ban user via admin endpoint, verify socket disconnect event fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
