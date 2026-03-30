---
phase: "05"
plan: "04"
subsystem: frontend-realtime
tags: [socket.io-client, react-query, websocket, messaging, frontend]
dependency_graph:
  requires: [05-03]
  provides: [frontend-socket-hook, useSocket]
  affects: [jogador/mensagens, time/mensagens]
tech_stack:
  added: [socket.io-client]
  patterns: [useEffect socket lifecycle, queryClient.setQueryData optimistic append, useRef socket handle]
key_files:
  created:
    - Projeto/apps/web/app/lib/messaging/use-socket.ts
  modified:
    - Projeto/apps/web/app/routes/jogador/mensagens.tsx
    - Projeto/apps/web/app/routes/time/mensagens.tsx
decisions:
  - "Use query key [\"messages\", conversationId] matching existing mensagens.tsx useQuery — not [\"conversations\", conversationId, \"messages\"]"
  - "socket.io-client already installed in package.json from prior plan — no npm install needed"
metrics:
  duration_min: 10
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 05 Plan 04: Socket.io Frontend Hook Summary

**One-liner:** useSocket hook wires socket.io-client to React Query cache with session-cookie auth and typing-event emit for both mensagens routes.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install socket.io-client and create use-socket.ts hook | b0073c4 | app/lib/messaging/use-socket.ts |
| 2 | Wire useSocket into both mensagens.tsx routes | 0aba621 | jogador/mensagens.tsx, time/mensagens.tsx |

---

## What Was Built

### use-socket.ts hook
- Connects to backend Socket.io server via `io(VITE_API_URL, { withCredentials: true, transports: ["websocket"] })` (D-08: session cookie auth)
- On `new_message` event: calls `queryClient.setQueryData(["messages", conversationId], ...)` with deduplication guard (D-06)
- On `typing_start` / `typing_stop`: calls optional callbacks passed by the component
- On `user_online` / `user_offline`: calls optional presence callbacks
- Returns `{ emitTypingStart, emitTypingStop }` for the component to call
- Cleanup: `socket.disconnect()` in useEffect return

### mensagens.tsx wiring (both jogador and time)
- Added `import { useSocket } from "~/lib/messaging/use-socket"`
- Added `useSocket({ conversationId: selectedId ?? null })` call
- Wired `emitTypingStart` to message Input `onChange`
- Wired `emitTypingStop` to message Input `onBlur`
- All changes are strictly additive — no existing code removed

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Query key `["messages", conversationId]` | Matches existing useQuery in mensagens.tsx — diverging would break cache coherence |
| socket.io-client already present | package.json had `"socket.io-client": "^4.8.3"` from Plan 05-01 — no install needed |

---

## Deviations from Plan

**1. [Rule 1 - Deviation] Query key corrected from plan spec**
- **Found during:** Task 1
- **Issue:** Plan spec suggested `["conversations", conversationId, "messages"]` but both mensagens.tsx files use `["messages", selectedId]`
- **Fix:** Used `["messages", conversationId]` to match existing components
- **Files modified:** use-socket.ts
- **Impact:** None — correctness improvement

---

## Known Stubs

None — the hook connects to a real Socket.io server and both routes call it with the active conversation ID.

---

## Checkpoint

**Type:** human-verify (auto-approved — auto_advance: true)
**What to verify:** Open two browser tabs, log in as different users, navigate to mensagens, send a message and confirm real-time delivery without page refresh. Type in input and confirm typing indicator appears/disappears.

---

## Self-Check: PASSED

- [x] `Projeto/apps/web/app/lib/messaging/use-socket.ts` exists
- [x] Commit b0073c4 exists
- [x] Commit 0aba621 exists
- [x] Both mensagens.tsx files contain `useSocket`
