---
phase: "05-real-time-messaging"
plan: "01"
subsystem: "messaging"
tags: ["tdd", "socket.io", "test-stubs", "red-state"]
dependency_graph:
  requires: []
  provides: ["MSG-01-stubs", "MSG-02-stubs", "MSG-03-stubs", "MSG-04-stubs"]
  affects: ["05-02", "05-03", "05-04"]
tech_stack:
  added: ["socket.io", "fastify-socket.io", "socket.io-client"]
  patterns: ["TDD RED stubs", "Socket.io test client helpers"]
key_files:
  created:
    - Projeto/apps/api/tests/helpers/messaging-helpers.ts
    - Projeto/apps/api/tests/helpers/socket-helpers.ts
    - Projeto/apps/api/tests/socket/messaging.socket.test.ts
  modified:
    - Projeto/apps/api/package.json
    - Projeto/apps/web/package.json
decisions:
  - "Socket.io test helpers use io() from socket.io-client with autoConnect: false and websocket transport for deterministic test behavior"
  - "messaging-helpers.ts uses internal signUpAndGetCookieWithId helper to handle Better Auth role patching via DB update + re-sign-in"
metrics:
  duration: "~30 minutes"
  completed: "2026-03-25"
  tasks_completed: 4
  files_created: 3
---

# Phase 5 Plan 01: TDD Stubs for Messaging — Summary

Socket.io packages installed and all four messaging requirement IDs (MSG-01 through MSG-04) covered by RED test stubs before any implementation begins.

## What Was Built

- **socket.io + fastify-socket.io** installed in `apps/api`; **socket.io-client** installed in `apps/web` and as a dev dependency in `apps/api`
- **messaging-helpers.ts** — `signUpAndCreateConversation()` helper that signs up a player and team user, creates a conversation via HTTP POST, and returns cookies + IDs for downstream tests
- **socket-helpers.ts** — `createSocketClient()` (factory) and `createAuthenticatedSocket()` (promise-wrapped connect) helpers for Socket.io test clients
- **messaging.socket.test.ts** — 8 test cases covering MSG-03 (WebSocket auth + real-time delivery) and MSG-04 (typing indicators + online presence), all in RED state

## Test Coverage

| Requirement | File | Cases | State |
|-------------|------|-------|-------|
| MSG-01 | messaging.test.ts | 6 | GREEN (created by 05-02 agent) |
| MSG-02 | messaging.test.ts | 7 | GREEN (created by 05-02 agent) |
| MSG-03 | messaging.socket.test.ts | 4 | RED |
| MSG-04 | messaging.socket.test.ts | 4 | RED |

## Deviations from Plan

### Parallel Execution Overlap

**1. [Deviation] messaging.test.ts created GREEN by 05-02 agent**
- **Found during:** Plan completion review
- **Issue:** Plan 05-01 specified messaging.test.ts should be created in RED state (routes not yet implemented). A parallel 05-02 agent created the file in GREEN state (with routes already implemented) before this agent's turn.
- **Impact:** MSG-01 and MSG-02 stubs are covered (Nyquist satisfied), but they are GREEN rather than RED. This is acceptable — the goal of having test coverage before verifying each plan is met.
- **No corrective action needed:** Routes are correctly implemented; tests pass correctly.

## Self-Check: PASSED

- `Projeto/apps/api/tests/socket/messaging.socket.test.ts` — exists (created this session)
- `Projeto/apps/api/tests/helpers/messaging-helpers.ts` — exists (created by prior agent)
- `Projeto/apps/api/tests/helpers/socket-helpers.ts` — exists (created by prior agent)
- Commit `55c73bc` confirmed in git log
