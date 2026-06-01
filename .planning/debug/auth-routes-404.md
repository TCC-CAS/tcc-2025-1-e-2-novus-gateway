---
status: fixing
trigger: "Frontend recebendo 404 em POST /api/auth/login e POST /api/auth/signup no servidor Fastify rodando em localhost:3000."
created: 2026-03-25T00:00:00Z
updated: 2026-03-25T00:00:00Z
---

## Current Focus

hypothesis: Backend registers Better Auth routes at /api/auth/sign-in/email and /api/auth/sign-up/email, but frontend calls /api/auth/login and /api/auth/signup — no backend route exists for the frontend's paths, causing 404.
test: Confirmed by reading plugins/auth.ts (fastify.post lines 82-83) and app/lib/api-client.ts (lines 78, 83).
expecting: Adding alias routes in plugins/auth.ts that forward /api/auth/login → Better Auth sign-in handler and /api/auth/signup → Better Auth sign-up handler will resolve the 404.
next_action: Add forwarding routes in plugins/auth.ts

## Symptoms

expected: POST http://localhost:3000/api/auth/login retorna 200 com sessão autenticada
actual: POST http://localhost:3000/api/auth/login retorna 404 Not Found (32ms)
errors: "HTTP/1.1 404 Not Found" em ambas as rotas /api/auth/login e /api/auth/signup
reproduction: Acessar o frontend e tentar fazer login ou signup
started: Desconhecido — pode nunca ter funcionado nesta configuração

## Eliminated

- hypothesis: Docker port mapping is wrong
  evidence: docker-compose.yml not the issue — the mismatch is at the route registration level, not networking
  timestamp: 2026-03-25T00:00:00Z

- hypothesis: Better Auth basePath is misconfigured
  evidence: basePath: "/api/auth" in lib/auth.ts is correct — Better Auth handles /api/auth/sign-in/email internally
  timestamp: 2026-03-25T00:00:00Z

## Evidence

- timestamp: 2026-03-25T00:00:00Z
  checked: Projeto/apps/api/src/plugins/auth.ts lines 82-83
  found: fastify.post("/api/auth/sign-in/email", ...) and fastify.post("/api/auth/sign-up/email", ...)
  implication: Backend only knows Better Auth's canonical paths

- timestamp: 2026-03-25T00:00:00Z
  checked: Projeto/apps/web/app/lib/api-client.ts lines 78, 83
  found: authApi.login calls "/auth/login" and authApi.signUp calls "/auth/signup" (resolves to /api/auth/login and /api/auth/signup)
  implication: Frontend uses simplified non-Better-Auth paths — these do not match any registered route

- timestamp: 2026-03-25T00:00:00Z
  checked: Projeto/apps/web/mocks/handlers/auth.ts lines 7, 23
  found: MSW intercepts /api/auth/login and /api/auth/signup in mock mode
  implication: Mock mode masked the mismatch — worked in dev with VITE_USE_MOCK=true, fails against real backend

## Resolution

root_cause: |
  The frontend api-client calls POST /api/auth/login and POST /api/auth/signup.
  The backend auth plugin only registers POST /api/auth/sign-in/email and POST /api/auth/sign-up/email
  (Better Auth's canonical route names). No route exists for the frontend's simplified paths → 404.
  MSW mock handlers masked this in dev mode by intercepting the simplified paths before they hit the network.

fix: |
  Add two forwarding routes in plugins/auth.ts that accept the frontend's simplified paths
  and proxy them to Better Auth by rewriting the URL to the canonical Better Auth paths
  before calling handleAuthRequest. This keeps the frontend contracts intact and requires
  no frontend changes.

verification: empty
files_changed:
  - Projeto/apps/api/src/plugins/auth.ts
