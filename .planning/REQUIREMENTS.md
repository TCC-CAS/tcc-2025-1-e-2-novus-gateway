# Requirements: VarzeaPro

**Defined:** 2026-03-23
**Core Value:** Players and teams find each other fast — every other feature exists to make that discovery trustworthy and sustainable.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can log in with email/password and receive a secure session (HttpOnly cookie + JWT via Better Auth)
- [x] **AUTH-02**: User can sign up with email/password and choose a role (`player` or `team`) at registration
- [x] **AUTH-03**: User can request a password reset (stub/log response — no live email delivery for TCC)
- [x] **AUTH-04**: All protected routes validate the session server-side and enforce RBAC by role

### Player Profiles

- [ ] **PLAY-01**: Player can create and edit their own profile (`PUT /players/me`)
- [ ] **PLAY-02**: Player can view their own profile (`GET /players/me`)
- [ ] **PLAY-03**: Anyone (authenticated) can view a player's public profile (`GET /players/:id`)

### Team Profiles

- [ ] **TEAM-01**: Team user can create and edit their own team profile (`PUT /teams/me`)
- [ ] **TEAM-02**: Team user can view their own profile (`GET /teams/me`)
- [ ] **TEAM-03**: Anyone (authenticated) can view a team's public profile (`GET /teams/:id`)

### Search

- [ ] **SRCH-01**: User can search players by filters with paginated results (`GET /search/players`)
- [ ] **SRCH-02**: User can search teams by filters with paginated results (`GET /search/teams`)

### Messaging

- [ ] **MSG-01**: User can create a conversation thread and list all their conversations (`GET/POST /conversations`)
- [ ] **MSG-02**: User can send and retrieve messages within a conversation (`GET/POST /conversations/:id/messages`)
- [ ] **MSG-03**: Messages are delivered in real-time via WebSocket (Socket.io) — no polling required
- [ ] **MSG-04**: Users see typing indicators and online presence via Socket.io events

### Subscriptions

- [ ] **SUB-01**: User can view their current plan and usage limits (`GET /subscription/usage`)
- [ ] **SUB-02**: User can upgrade their subscription plan via API (`POST /subscription/upgrade`) — no payment gateway
- [ ] **SUB-03**: Backend enforces plan limits server-side via middleware on protected endpoints

### Admin

- [ ] **ADM-01**: Admin can list all users and view individual user detail (`GET /admin/users`, `GET /admin/users/:id`)
- [ ] **ADM-02**: Admin can ban a user account (`POST /admin/users/:id/ban`)
- [ ] **ADM-03**: Admin can view content moderation reports (`GET /admin/moderation/reports`)
- [ ] **ADM-04**: Admin can take action on moderation reports — dismiss or remove (`POST /admin/moderation/reports/:id`)

### Infrastructure

- [x] **INFRA-01**: Application runs via Docker Compose — `web` + `api` + `postgres` containers on a single VPS
- [x] **INFRA-02**: GitHub Actions CI/CD pipelines for test, build, and deploy (`test.yml`, `build.yml`, `deploy.yml`)
- [ ] **INFRA-03**: Automated backend test suite — Vitest unit + integration tests covering all API domains
- [ ] **INFRA-04**: Security hardening — rate limiting, helmet, Zod input validation, CORS, DDoS protection, WebSocket auth

## v2 Requirements

### Authentication

- **AUTH-V2-01**: User can log in via OAuth (Google, Discord)
- **AUTH-V2-02**: User can enable two-factor authentication (2FA)
- **AUTH-V2-03**: Refresh token rotation (short-lived access + long-lived refresh)

### Notifications

- **NOTF-V2-01**: User receives in-app notifications for new messages
- **NOTF-V2-02**: User receives email notifications (live email delivery)
- **NOTF-V2-03**: User can configure notification preferences

### Search Enhancements

- **SRCH-V2-01**: Full-text search with `pg_trgm` for fuzzy matching
- **SRCH-V2-02**: Search with geolocation / region filtering

### Messaging Enhancements

- **MSG-V2-01**: Message read receipts
- **MSG-V2-02**: Message reactions / emoji
- **MSG-V2-03**: File/image attachments in conversations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payment gateway / real billing | Subscriptions enforced in DB only; no financial transactions for TCC |
| Live email delivery | Password reset uses stub/log; email service adds infra complexity |
| Mobile app | Web-first; mobile is post-TCC |
| Redis / caching layer | Premature optimization; PostgreSQL sufficient for TCC scale |
| Video/streaming features | Out of domain scope for v1 |
| Multiple game-specific data models | Platform is game-agnostic in v1 |
| SSR / server-side rendering | Frontend uses React Router client-side auth; no SSR auth required |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| PLAY-01 | Phase 3 | Pending |
| PLAY-02 | Phase 3 | Pending |
| PLAY-03 | Phase 3 | Pending |
| TEAM-01 | Phase 3 | Pending |
| TEAM-02 | Phase 3 | Pending |
| TEAM-03 | Phase 3 | Pending |
| SRCH-01 | Phase 4 | Pending |
| SRCH-02 | Phase 4 | Pending |
| SUB-01 | Phase 4 | Pending |
| SUB-02 | Phase 4 | Pending |
| SUB-03 | Phase 4 | Pending |
| MSG-01 | Phase 5 | Pending |
| MSG-02 | Phase 5 | Pending |
| MSG-03 | Phase 5 | Pending |
| MSG-04 | Phase 5 | Pending |
| ADM-01 | Phase 6 | Pending |
| ADM-02 | Phase 6 | Pending |
| ADM-03 | Phase 6 | Pending |
| ADM-04 | Phase 6 | Pending |
| INFRA-03 | Phase 7 | Pending |
| INFRA-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
