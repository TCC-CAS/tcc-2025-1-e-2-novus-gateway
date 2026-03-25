---
phase: 5
slug: real-time-messaging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run src/modules/messaging` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run src/modules/messaging`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | MSG-01 | unit | `npm test -- --run src/modules/messaging/messaging.schema` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | MSG-01 | integration | `npm test -- --run src/modules/messaging/conversations.routes` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | MSG-02 | integration | `npm test -- --run src/modules/messaging/messages.routes` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | MSG-03 | integration | `npm test -- --run src/modules/messaging/socket.gateway` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | MSG-03 | integration | `npm test -- --run src/modules/messaging/socket.auth` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | MSG-04 | integration | `npm test -- --run src/modules/messaging/presence` | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 2 | MSG-04 | integration | `npm test -- --run src/modules/messaging/typing` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/modules/messaging/__tests__/conversations.routes.test.ts` — stubs for MSG-01 (POST/GET /conversations)
- [ ] `src/modules/messaging/__tests__/messages.routes.test.ts` — stubs for MSG-02 (GET/POST /conversations/:id/messages)
- [ ] `src/modules/messaging/__tests__/socket.gateway.test.ts` — stubs for MSG-03 (real-time delivery via Socket.io)
- [ ] `src/modules/messaging/__tests__/socket.auth.test.ts` — stubs for MSG-03 (unauthenticated connection rejection)
- [ ] `src/modules/messaging/__tests__/presence.test.ts` — stubs for MSG-04 (typing indicators + online presence)
- [ ] `src/modules/messaging/__tests__/helpers/socket-test-client.ts` — shared Socket.io test client fixture

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-time message delivery across two browser tabs | MSG-03 | Requires two concurrent WebSocket connections with live UI | Open two tabs, log in as different users, send message, verify recipient sees it without refresh |
| Typing indicator visual feedback | MSG-04 | Requires observing UI animation in browser | Log in as two users, start typing in one tab, verify typing indicator appears in other tab |
| Online/offline presence status changes | MSG-04 | Requires disconnect/reconnect lifecycle in browser | Log in as user A, verify user B shows as online; close tab, verify B shows offline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
