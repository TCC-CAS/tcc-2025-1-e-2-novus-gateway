---
phase: 3
slug: player-team-profiles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `Projeto/apps/api/vitest.config.ts` |
| **Quick run command** | `cd Projeto/apps/api && bun run test --run` |
| **Full suite command** | `cd Projeto/apps/api && bun run test --run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd Projeto/apps/api && bun run test --run`
- **After every plan wave:** Run `cd Projeto/apps/api && bun run test --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | PLAY-01,02,03 | unit | `bun run test --run tests/routes/players.test.ts` | ❌ W0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | TEAM-01,02,03 | unit | `bun run test --run tests/routes/teams.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | PLAY-01 | unit | `bun run test --run tests/routes/players.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | PLAY-02 | unit | `bun run test --run tests/routes/players.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | PLAY-03 | unit | `bun run test --run tests/routes/players.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | TEAM-01 | unit | `bun run test --run tests/routes/teams.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | TEAM-02 | unit | `bun run test --run tests/routes/teams.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | TEAM-03 | unit | `bun run test --run tests/routes/teams.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Projeto/apps/api/tests/routes/players.test.ts` — stubs for PLAY-01, PLAY-02, PLAY-03 (GET /players/me, PUT /players/me, GET /players/:id)
- [ ] `Projeto/apps/api/tests/routes/teams.test.ts` — stubs for TEAM-01, TEAM-02, TEAM-03 (GET /teams/me, PUT /teams/me, GET /teams/:id)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile data persists across server restarts | PLAY-01, TEAM-01 | DB state requires live Postgres | Start server, upsert profile, restart, GET profile and confirm data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
