---
status: awaiting_human_verify
trigger: "Após cadastro/login, o usuário não é redirecionado para o onboarding, o perfil de jogador/time não é criado, e ao acessar 'meu perfil' a API retorna 404."
created: 2026-03-25T00:00:00Z
updated: 2026-03-25T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED (round 2) — three new save bugs found and fixed:
  (A) onboarding.tsx handleFinish had guards (playerPositions.length>=1, teamName.length>=2) that silently skipped the upsert API call when user skipped steps.
  (B) api-client.ts request<T> returned the raw { data: T } envelope instead of unwrapping it — causing form.reset in time/perfil-editar to receive { data: profile } typed as TeamProfile, making profile.name undefined, blocking Zod validation silently.
test: n/a — fixes applied
expecting: n/a
next_action: human verify — test onboarding save for player and team roles, and team perfil-editar save

## Symptoms

expected: Após cadastro ou login → redirecionar para /onboarding → criar perfil de jogador/time → permitir acesso a /api/players/me ou /api/teams/me sem 404
actual: Não redireciona para onboarding após cadastro/login. Perfil não é criado automaticamente. Ao acessar "meu perfil", retorna 404.
errors: XHR GET http://localhost:3000/api/teams/me [HTTP/1.1 404 Not Found 0ms] — response: { code: "NOT_FOUND", message: "Profile not found" }
reproduction: Cadastrar novo usuário OU fazer login → tentar acessar "meu perfil"
started: Ocorre em ambos (cadastro e login), para ambos os roles (player e team)

## Eliminated

- hypothesis: Backend has no profile creation hook on signup
  evidence: Profile creation is intentionally done via onboarding (PUT /api/players/me and PUT /api/teams/me). Backend upsert routes exist and are correct.
  timestamp: 2026-03-25

- hypothesis: Auth/session fails (cookie not sent)
  evidence: api-client uses credentials:"include" so cookie is sent. requireSession reads cookie via fromNodeHeaders. Auth flow works.
  timestamp: 2026-03-25

## Evidence

- timestamp: 2026-03-25
  checked: api-client.ts teamsApi.upsert
  found: Calls PUT /teams (path="/teams") — full URL becomes http://localhost:3000/api/teams
  implication: Backend registers PUT /me under prefix /api/teams → full path is PUT /api/teams/me. Frontend sends to wrong path → 404.

- timestamp: 2026-03-25
  checked: auth plugin (plugins/auth.ts line 46-51)
  found: token field is stripped from all Better Auth responses before sending to client
  implication: authApi.signUp/login return { user, token: undefined }. Frontend calls login(sessionUser, "") with empty string. authHeaders() returns {} (empty string is falsy). NO Bearer token is ever sent. Auth relies solely on HttpOnly cookie.

- timestamp: 2026-03-25
  checked: login.tsx onSubmit — hasProfile detection
  found: Calls playersApi.getMe()/teamsApi.getMe() immediately after login response. These calls use cookie auth (credentials:include). Cookie IS set by Better Auth. Detection logic works correctly — if no profile exists, redirects to /onboarding.
  implication: Redirect to /onboarding works for LOGIN. For CADASTRO (cadastro.tsx line 71), it always navigates to /onboarding directly — correct.

- timestamp: 2026-03-25
  checked: onboarding.tsx handleFinish — teamsApi.upsert call
  found: teamsApi.upsert calls PUT /teams. Backend route is PUT /me under prefix /api/teams = PUT /api/teams/me. Mismatch.
  implication: Team profile is NEVER created. After onboarding, GET /api/teams/me returns 404 because no row exists in teams table.

- timestamp: 2026-03-25
  checked: playersApi.upsert in api-client.ts
  found: Calls PUT /players/me — backend is PUT /me under prefix /api/players = PUT /api/players/me. CORRECT.
  implication: Player profile creation works. Only teams are broken.

- timestamp: 2026-03-26
  checked: auth.ts databaseHooks — presence of after hook
  found: No after hook existed. Only a before hook that coerces role. No profile row was ever inserted on signup.
  implication: Any user who skips onboarding (or whose onboarding fails) has no profile row, causing GET /me to return 404 permanently.

- timestamp: 2026-03-26
  checked: players schema (name NOT NULL), teams schema (name NOT NULL, level NOT NULL enum)
  found: Minimum viable defaults for auto-created profiles: players needs {id, userId, name}; teams needs {id, userId, name, level}.
  implication: Default team level set to "outro" (valid enum value). Default player profile has empty arrays for positions/skills (schema defaults).

- timestamp: 2026-03-26
  checked: nanoid availability in apps/api/node_modules
  found: nanoid already present as transitive dependency — safe to import in auth.ts.
  implication: No new package installation needed.

- timestamp: 2026-03-25T00:00:00Z
  checked: onboarding.tsx handleFinish — conditional guards
  found: if (isPlayer && playerPositions.length >= 1) and else if (!isPlayer && teamName.trim().length >= 2) — both guards silently skip the upsert when user skips steps without filling those fields
  implication: Player onboarding always skips upsert unless user picks at least one position. Team onboarding always skips upsert if user skips step 1 (teamName stays ""). Fixed by removing guards and using user!.name as team name fallback.

- timestamp: 2026-03-25T00:00:00Z
  checked: api-client.ts request<T> — return value vs. backend ok() envelope
  found: Backend ok(data) returns { data: T }. request<T> parsed body and returned body as T — but body was { data: T } not T. TypeScript cast hid the mismatch. profile.name in time/perfil-editar was always undefined at runtime.
  implication: form.reset received name=undefined, Zod z.string().min(2) blocked submit silently (no mutation error toast shown). Fixed by adding envelope auto-unwrap in request<T>: if parsed body has a .data key, return body.data.

- timestamp: 2026-03-25
  checked: perfil.tsx lines 100 and 140 — profile.positions.map() and profile.skills usage
  found: Both arrays accessed without null guards. DB schema defines .notNull().default([]) but API response can return null/undefined when row was inserted with only {id, userId, name} (no explicit array values passed to INSERT).
  implication: TypeError crash "can't access property map, profile.positions is undefined". Fixed by adding `?? []` fallback on all positions and skills access sites in perfil.tsx.

## Resolution

root_cause: (1) Backend never created a default profile on signup — onboarding is optional so GET /me returned 404 permanently. (2) teamsApi.upsert sent PUT /teams instead of PUT /teams/me. (3) Frontend crashed at perfil.tsx because profile.positions/skills were null. (4) Same null-array pattern in perfil-editar.tsx: form.watch("positions")/("skills") returns undefined before useEffect hydrates, .includes() crashes. Same for time/perfil-editar.tsx openPositions in form.reset. (5) UpsertPlayerProfileRequestSchema had positions.min(1) blocking save when user has no positions selected on a freshly-created profile — submit silently rejected by Zod client-side. (6) onboarding.tsx handleFinish had conditional guards (playerPositions.length>=1 / teamName.length>=2) that silently skipped the upsert entirely when user skipped steps. (7) api-client.ts request<T> returned the raw { data: T } envelope without unwrapping — all getMe/getById/upsert responses were envelope objects, not the profile directly. time/perfil-editar form.reset received { data: profile } as name=undefined, Zod blocked submit silently with no toast.
fix: (1) Added databaseHooks.user.create.after in auth.ts. (2) teamsApi.upsert path corrected. (3) Added `?? []` in perfil.tsx. (4) Added `?? []` in form.reset and form.watch calls in jogador/perfil-editar.tsx and time/perfil-editar.tsx. (5) Removed .min(1) from positions in UpsertPlayerProfileRequestSchema; removed corresponding error UI in perfil-editar.tsx. (6) Removed conditional guards in onboarding.tsx handleFinish — always call upsert; team uses `teamName.trim() || user!.name` as name fallback. (7) api-client.ts request<T> now auto-unwraps { data: T } envelope before returning.
verification: awaiting human confirmation
files_changed: [Projeto/apps/api/src/lib/auth.ts, Projeto/apps/web/app/lib/api-client.ts, Projeto/apps/web/app/routes/onboarding.tsx, Projeto/apps/web/app/routes/jogador/perfil.tsx, Projeto/apps/web/app/routes/jogador/perfil-editar.tsx, Projeto/apps/web/app/routes/time/perfil-editar.tsx, Projeto/apps/web/shared/contracts/players.ts]
