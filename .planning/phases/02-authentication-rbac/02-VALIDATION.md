---
phase: 2
slug: authentication-rbac
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Node.js/TypeScript) |
| **Config file** | Projeto/apps/api/vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `cd Projeto/apps/api && npm run test:auth` |
| **Full suite command** | `cd Projeto/apps/api && npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd Projeto/apps/api && npm run test:auth`
- **After every plan wave:** Run `cd Projeto/apps/api && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-xx-01 | 01 | 0 | AUTH-01 | unit | `npm run test -- --grep "signup"` | ❌ W0 | ⬜ pending |
| 2-xx-02 | 01 | 1 | AUTH-01 | integration | `npm run test -- --grep "signup"` | ❌ W0 | ⬜ pending |
| 2-xx-03 | 01 | 1 | AUTH-02 | integration | `npm run test -- --grep "login"` | ❌ W0 | ⬜ pending |
| 2-xx-04 | 01 | 1 | AUTH-02 | integration | `npm run test -- --grep "session cookie"` | ❌ W0 | ⬜ pending |
| 2-xx-05 | 01 | 1 | AUTH-03 | integration | `npm run test -- --grep "password reset"` | ❌ W0 | ⬜ pending |
| 2-xx-06 | 01 | 2 | AUTH-04 | integration | `npm run test -- --grep "401\|403"` | ❌ W0 | ⬜ pending |
| 2-xx-07 | 01 | 2 | AUTH-04 | integration | `npm run test -- --grep "rate limit"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Projeto/apps/api/src/test/auth.test.ts` — stubs for AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `Projeto/apps/api/src/test/helpers.ts` — shared Fastify `inject()` test helpers + DB setup/teardown
- [ ] `Projeto/apps/api/vitest.config.ts` — vitest config if not already present
- [ ] `npm install -D vitest @vitest/runner` — if no test framework detected

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HttpOnly cookie not visible in browser JS | AUTH-02 | Requires browser DevTools inspection | Open browser, login, check Application > Cookies: `document.cookie` must NOT contain session token |
| Password reset token logged to console | AUTH-03 | Log output inspection | Trigger password reset, check server console output for token/URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
