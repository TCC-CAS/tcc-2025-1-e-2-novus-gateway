# Phase 6: Admin Panel - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend API endpoints for admin user management and content moderation. Admins can list users, view user detail, ban/unban accounts, view moderation reports, and take action on reports (dismiss, remove, warn). All `/admin/*` routes gated behind `requireRole("admin")`. Every significant admin action is recorded in the `audit_logs` table.

</domain>

<decisions>
## Implementation Decisions

### Ban Enforcement
- **D-01:** Banning sets user status to `banned` in DB AND invalidates all active Better Auth sessions immediately. The user is kicked out instantly and cannot log back in.
- **D-02:** `requireAuth` (or a downstream hook) checks user status on every authenticated request — banned users get `403` even if they somehow retain a session token.
- **D-03:** Banning also force-disconnects the user's active WebSocket (Socket.io) connections. No ghost messages from banned users.
- **D-04:** Unban capability included in this phase via `POST /admin/users/:id/unban`. Restores user status to `active`, allowing them to log in again.

### Report Actions
- **D-05:** `dismiss` — Sets report status to `dismissed`. Reported entity stays untouched. Audit log records who dismissed it, with optional note.
- **D-06:** `remove` — Soft delete of the reported entity (player profile, team profile, or message). Entity is marked as hidden/removed but preserved in DB for audit purposes. Disappears from public views.
- **D-07:** `warn` — Records warning in `audit_logs` with admin's note AND increments a warning count on the user record. Can be used later for automatic escalation (e.g., 3 warnings = ban), but escalation logic is not in scope for this phase.

### Audit Logging
- **D-08:** All moderation actions (dismiss, remove, warn) are written to `audit_logs` — required by success criteria.
- **D-09:** Ban and unban actions are also written to `audit_logs` for accountability.
- **D-10:** Admin viewing a specific user's detail page is logged to `audit_logs` for traceability.
- **D-11:** Claude has discretion to log additional admin actions where it makes sense for accountability, without over-logging routine list views.

### User List Filters
- **D-12:** `GET /admin/users` supports filtering by status (active/banned/pending).
- **D-13:** `GET /admin/users` supports filtering by role (player/team/admin).
- **D-14:** `GET /admin/users` supports text search on user name or email.
- **D-15:** Claude has discretion on additional filter implementation details that align with the `ListUsersQuery` contract shape.

### Claude's Discretion
- Additional audit log entries beyond the explicitly listed ones (D-11)
- Filter implementation details beyond status, role, and search (D-15)
- Internal helpers, query optimization, and code organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shared Contracts (source of truth for all request/response shapes)
- `Projeto/apps/web/shared/contracts/users.ts` — UserSummary, UserDetail, ListUsersQuery, ListUsersResponse, BanUserRequest, UserStatus
- `Projeto/apps/web/shared/contracts/moderation.ts` — ReportSummary, ListReportsQuery, ListReportsResponse, ModerateReportRequest, ReportReason, ReportStatus

### Database Schema
- `Projeto/apps/api/src/db/schema/audit-logs.ts` — audit_logs table (adminId, action, targetEntityType, targetEntityId, note)
- `Projeto/apps/api/src/db/schema/moderation-reports.ts` — moderation_reports table (reporterId, reportedEntityType, reportedEntityId, reason, description, status)
- `Projeto/apps/api/src/db/schema/users.ts` — users table (check for status column and warning count field)

### Existing Infrastructure to Reuse
- `Projeto/apps/api/src/hooks/require-auth.ts` — requireSession and requireRole preHandler hooks
- `Projeto/apps/api/src/lib/errors.ts` — error factory for consistent error responses
- `Projeto/apps/api/src/app.ts` — route registration pattern and existing `requireRole("admin")` test endpoint

### Frontend API Client (verify endpoint signatures)
- `Projeto/apps/web/app/lib/api-client.ts` — adminUsersApi and adminModerationApi sections

### Requirements
- `.planning/REQUIREMENTS.md` §Admin — ADM-01 through ADM-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireRole("admin")` preHandler — already tested in `app.ts` test endpoint
- `requireSession` — extracts authenticated user from session
- Error factory in `src/lib/errors.ts` — consistent error responses
- Drizzle ORM query patterns established in players, teams, search routes
- Pagination pattern from search routes (page/pageSize/total/totalPages)
- Socket.io server instance — needed for force-disconnect on ban

### Established Patterns
- Routes registered as Fastify plugins in `src/routes/` and imported in `src/app.ts`
- Zod validation via `fastify-type-provider-zod` — schema declared in route options
- Email-keyed rate limiting applied via preHandler hook
- Response shape: `{ data: T }` for single items, `{ data: T[], meta: {...} }` for lists

### Integration Points
- `src/app.ts` — register new admin route plugin(s)
- Better Auth session management — session invalidation on ban
- Socket.io server — force disconnect banned user's connections
- Users table — status field update for ban/unban, warning count for warn action
- Moderation reports table — status update for dismiss/remove actions

</code_context>

<specifics>
## Specific Ideas

- Warning count on user record enables future escalation (3 warnings = auto-ban) but the escalation logic itself is deferred
- Soft delete for "remove" action preserves data integrity and audit trail
- Force WebSocket disconnect on ban ensures clean break from real-time features

</specifics>

<deferred>
## Deferred Ideas

- Automatic escalation logic (N warnings triggers ban) — future phase
- Email notifications for warnings — email delivery is out of scope for v1
- Report creation endpoint (for users to submit reports) — may already exist or belong in a separate phase
- Unban notification to user — depends on notification system

</deferred>

---

*Phase: 06-admin-panel*
*Context gathered: 2026-03-26*
