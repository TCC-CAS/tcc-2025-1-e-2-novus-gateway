# Phase 5: Real-Time Messaging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25

---

## Socket.io Scope

**Q: How should we handle the real-time layer given the frontend has no socket.io-client?**

Options presented:
- Backend-only — full Socket.io server, SC-3/SC-4 verified via Vitest integration tests only
- **Add socket.io-client to frontend** ← selected
- HTTP-only, skip WebSocket

**Q: What Socket.io events should the backend emit/listen to?**

Options presented:
- **Standard set: new_message, typing_start/stop, user_online/offline** ← selected
- Minimal — messages only
- User-defined

**Q: Socket.io authentication method?**

Options presented:
- **Cookie-based via io.use() + Better Auth getSession()** ← selected
- Pass session token as query param

**Q: Should POST /conversations/:id/messages also emit new_message?**

Options presented:
- **Yes — HTTP + emit (HTTP is source of truth, socket is delivery)** ← selected
- Emit only (no HTTP persistence)
- Separate paths (same as option 1)

**Q: Where should the socket.io-client hook live?**

Options presented:
- **New hook file: app/lib/messaging/use-socket.ts** ← selected
- Inline in mensagens.tsx files
- Claude decides

---

## Conversation Limits

**Q: Should POST /conversations enforce the plan's conversationsLimit?**

Options presented:
- **Yes — enforce with 403** ← selected
- Enforce but silent cap (400)
- No enforcement

**Q: What should POST /conversations return if conversation already exists?**

Options presented:
- **Return existing conversation with 200 OK (idempotent)** ← selected
- Return 409 Conflict
- Claude decides

---

## Messages Pagination

**Q: Do we paginate GET /conversations/:id/messages?**

Options presented:
- **Load all, no pagination — meta = { page:1, pageSize:total, total, totalPages:1 }** ← selected
- Offset pagination (page + pageSize)
- Cursor-based pagination

**Q: Messages ordering?**

Options presented:
- **Oldest first — ORDER BY id ASC** ← selected
- Newest first
- Claude decides

---

## unreadCount Computation

**Q: How to compute unreadCount in ConversationSummary?**

Options presented:
- **COUNT WHERE readAt IS NULL AND senderId != me** ← selected
- Always return 0
- Separate read_receipts table

**Q: Do we need a mark-as-read endpoint?**

Options presented:
- **No — auto-mark on GET /conversations/:id/messages** ← selected
- Yes — explicit PUT endpoint
- Claude decides
