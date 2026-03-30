# Phase 6: Admin Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 06-admin-panel
**Areas discussed:** Ban enforcement, Report actions, Audit logging, User list filters

---

## Ban Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate full block | Set user status to 'banned' in DB + invalidate all active sessions. Banned user is kicked out instantly and can't log back in. requireAuth checks status on every request. | ✓ |
| Soft block on next request | Set status to 'banned' but don't kill existing sessions. User gets blocked when their current session expires or on next API call that checks status. | |
| Session invalidation only | Kill all sessions but don't flag the user record. User can technically re-register or log in again unless further checks are added. | |

**User's choice:** Immediate full block (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add POST /admin/users/:id/unban | Restores user status to 'active'. User can log in again after unban. | ✓ |
| No, ban is permanent for v1 | Keep it simple — no unban endpoint. | |
| You decide | Claude picks based on what the frontend expects. | |

**User's choice:** Yes, add POST /admin/users/:id/unban
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, force disconnect | When banning, find the user's active socket connections and disconnect them. Clean break. | ✓ |
| No, let it expire naturally | Socket connections will fail on next auth check or reconnect. | |

**User's choice:** Yes, force disconnect (Recommended)
**Notes:** None

---

## Report Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete | Mark the entity as hidden/removed but keep it in DB. Disappears from public views but data is preserved for audit. | ✓ |
| Hard delete | Permanently delete the reported entity from the database. Irreversible. | |
| You decide | Claude picks the approach that fits the existing schema best. | |

**User's choice:** Soft delete (Recommended)
**Notes:** For the 'remove' action on reported entities

---

| Option | Description | Selected |
|--------|-------------|----------|
| Log only | Record the warning in audit_log with the admin's note. No notification sent to the user. | |
| Log + flag on user record | Record in audit_log AND increment a warning count on the user. Could be used later for automatic escalation. | ✓ |
| Skip warn for v1 | Remove 'warn' from supported actions and only implement 'dismiss' and 'remove'. | |

**User's choice:** Log + flag on user record
**Notes:** For the 'warn' action

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mark as dismissed, no action | Set report status to 'dismissed'. Reported entity stays untouched. Audit log records who dismissed it. | ✓ |
| Delete the report entirely | Remove the report from the database. No trace remains. | |

**User's choice:** Mark as dismissed, no action (Recommended)
**Notes:** For the 'dismiss' action

---

## Audit Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Moderation actions (Required) | dismiss, remove, warn on reports — in the success criteria. Always logged. | ✓ |
| Ban and unban | Log when an admin bans or unbans a user. Important for accountability. | ✓ |
| User detail views | Log when an admin views a specific user's detail page. Higher traceability. | ✓ |
| You decide the rest | Claude logs what makes sense for accountability without over-logging. | ✓ |

**User's choice:** All options selected
**Notes:** None

---

## User List Filters

| Option | Description | Selected |
|--------|-------------|----------|
| Status filter | Filter by active/banned/pending. Essential for finding banned users. | ✓ |
| Role filter | Filter by player/team/admin. Useful to see all teams or all players. | ✓ |
| Search by name/email | Text search on user name or email. Helps find specific users quickly. | ✓ |
| You decide | Claude implements what the frontend ListUsersQuery contract supports. | ✓ |

**User's choice:** All options selected
**Notes:** None

---

## Claude's Discretion

- Additional audit log entries beyond explicitly listed ones
- Filter implementation details beyond status, role, and search
- Internal helpers, query optimization, and code organization

## Deferred Ideas

- Automatic escalation logic (N warnings triggers ban) — future phase
- Email notifications for warnings — email delivery out of scope for v1
- Report creation endpoint — separate phase
- Unban notification to user — depends on notification system
