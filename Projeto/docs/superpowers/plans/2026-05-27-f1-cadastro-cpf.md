# F1 — Cadastro Separado (CPF + Campos por Role) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CPF to all user registrations and split the sign-up form so teams see "Nome do Time" + "Nome do Responsável" instead of a single "Nome" field.

**Architecture:** Better Auth accepts `cpf` and `teamName` as `additionalFields` (input: true). The existing `databaseHooks.user.create.after` already creates player/team records — extend it to use `teamName` as team name and store responsible name. CPF is stored directly in the `users` table via Drizzle schema change.

**Tech Stack:** Drizzle ORM (schema + migration), Better Auth `additionalFields`, React Hook Form + Zod (frontend), Vitest + Fastify inject (tests)

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/api/src/db/schema/users.ts` |
| Modify | `apps/api/src/db/schema/teams.ts` |
| Generate | `apps/api/src/db/migrations/<new>.sql` (via drizzle-kit) |
| Modify | `apps/api/src/lib/auth.ts` |
| Modify | `apps/web/shared/contracts/auth.ts` |
| Modify | `apps/web/app/routes/cadastro.tsx` |
| Modify | `apps/api/tests/routes/auth.test.ts` (or create) |

---

### Task 1: Add `cpf` column to users schema

**Files:**
- Modify: `apps/api/src/db/schema/users.ts`

- [ ] **Step 1: Read the current users schema**

```bash
cat apps/api/src/db/schema/users.ts
```

- [ ] **Step 2: Add `cpf` field to the users table**

In `apps/api/src/db/schema/users.ts`, add after the `name` field:

```typescript
  cpf: text("cpf").unique(),
```

The full updated table definition (only the `cpf` line is new):

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  cpf: text("cpf").unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull(),
  planId: planIdEnum("plan_id").notNull().default("free"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  warnCount: integer("warn_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

---

### Task 2: Add `responsible_name` column to teams schema

**Files:**
- Modify: `apps/api/src/db/schema/teams.ts`

- [ ] **Step 1: Add `responsible_name` to teams table**

In `apps/api/src/db/schema/teams.ts`, add after the `name` field:

```typescript
  responsibleName: text("responsible_name"),
```

Full updated table definition:

```typescript
export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  name: text("name").notNull(),
  responsibleName: text("responsible_name"),
  logoUrl: text("logo_url"),
  level: teamLevelEnum("level").notNull(),
  region: text("region"),
  city: text("city"),
  description: text("description"),
  openPositions: text("open_positions").array().notNull().default([]),
  matchDays: text("match_days").array().default([]),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

---

### Task 3: Generate and verify the Drizzle migration

**Files:**
- Generate: `apps/api/src/db/migrations/<new_name>.sql`

- [ ] **Step 1: Run drizzle-kit generate from the api directory**

```bash
cd apps/api && npx drizzle-kit generate
```

Expected output: something like `Generated 1 migration file in src/db/migrations/`
A new file like `0001_<name>.sql` will be created.

- [ ] **Step 2: Verify the generated SQL is correct**

```bash
cat apps/api/src/db/migrations/$(ls apps/api/src/db/migrations/ | grep -v meta | sort | tail -1)
```

Expected SQL (order may vary):

```sql
ALTER TABLE "users" ADD COLUMN "cpf" text UNIQUE;
ALTER TABLE "teams" ADD COLUMN "responsible_name" text;
```

- [ ] **Step 3: Commit schema changes**

```bash
git add apps/api/src/db/schema/users.ts apps/api/src/db/schema/teams.ts apps/api/src/db/migrations/
git commit -m "feat(db): add cpf to users, responsible_name to teams"
```

---

### Task 4: Update Better Auth additionalFields and databaseHooks

**Files:**
- Modify: `apps/api/src/lib/auth.ts`

- [ ] **Step 1: Add `cpf` and `teamName` to Better Auth `additionalFields`**

In `apps/api/src/lib/auth.ts`, update the `user.additionalFields` block:

```typescript
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "player",
          input: true,
        },
        cpf: {
          type: "string",
          required: false,
          input: true,
        },
        teamName: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
```

- [ ] **Step 2: Update `databaseHooks.user.create.after` to use teamName and store responsibleName**

In the same file, replace the `after` hook body:

```typescript
          after: async (user) => {
            const u = user as Record<string, unknown>
            const role = u.role as string
            const userId = u.id as string
            const name = (u.name as string | undefined) ?? ""
            const teamName = (u.teamName as string | undefined) ?? name

            if (role === "player") {
              await db
                .insert(schema.players)
                .values({ id: nanoid(), userId, name })
                .onConflictDoNothing()
            } else if (role === "team") {
              await db
                .insert(schema.teams)
                .values({
                  id: nanoid(),
                  userId,
                  name: teamName,
                  responsibleName: name,
                  level: "outro",
                })
                .onConflictDoNothing()
            }

            void emailService.sendWelcome(u.email as string, name)
          },
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/auth.ts
git commit -m "feat(auth): accept cpf and teamName in sign-up, set team responsible_name"
```

---

### Task 5: Update shared contract SignUpRequestSchema

**Files:**
- Modify: `apps/web/shared/contracts/auth.ts`

- [ ] **Step 1: Add `cpf` and `teamName` fields with cross-field validation**

Replace the existing `SignUpRequestSchema` definition:

```typescript
/** Sign up request body */
export const SignUpRequestSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: PasswordSchema,
    confirmPassword: z.string(),
    role: RoleSchema,
    cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos sem pontuação"),
    teamName: z.string().min(2, "Nome do time deve ter pelo menos 2 caracteres").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => data.role !== "team" || (!!data.teamName && data.teamName.length >= 2),
    { message: "Nome do time é obrigatório para times", path: ["teamName"] }
  )
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/shared/contracts/auth.ts
git commit -m "feat(contracts): add cpf and teamName to SignUpRequestSchema"
```

---

### Task 6: Update the cadastro.tsx form

**Files:**
- Modify: `apps/web/app/routes/cadastro.tsx`

- [ ] **Step 1: Add CPF input mask helper**

At the top of the file (after existing imports), add:

```typescript
function formatCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}
```

- [ ] **Step 2: Add `cpf` and `teamName` to form defaultValues**

Update the `useForm` call:

```typescript
  const form = useForm<SignUpRequest>({
    resolver: zodResolver(SignUpRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "player",
      cpf: "",
      teamName: "",
    },
  })
```

- [ ] **Step 3: Replace the name field section with role-conditional fields**

Find the block that renders the `name` input field and replace it with:

```tsx
{/* CPF — for all roles */}
<Field>
  <Label htmlFor="cpf">CPF</Label>
  <Input
    id="cpf"
    placeholder="Somente números (11 dígitos)"
    maxLength={11}
    {...form.register("cpf", {
      onChange: (e) => {
        e.target.value = formatCpf(e.target.value)
        form.setValue("cpf", e.target.value, { shouldValidate: true })
      },
    })}
  />
  {form.formState.errors.cpf && (
    <p className="text-sm text-red-500">{form.formState.errors.cpf.message}</p>
  )}
</Field>

{/* Name field — label changes by role */}
{role !== "team" ? (
  <Field>
    <Label htmlFor="name">NOME COMPLETO</Label>
    <Input
      id="name"
      placeholder="Seu nome completo"
      {...form.register("name")}
    />
    {form.formState.errors.name && (
      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
    )}
  </Field>
) : (
  <>
    <Field>
      <Label htmlFor="teamName">NOME DO TIME</Label>
      <Input
        id="teamName"
        placeholder="Nome do seu time"
        {...form.register("teamName")}
      />
      {form.formState.errors.teamName && (
        <p className="text-sm text-red-500">{form.formState.errors.teamName.message}</p>
      )}
    </Field>
    <Field>
      <Label htmlFor="name">NOME DO RESPONSÁVEL</Label>
      <Input
        id="name"
        placeholder="Seu nome completo"
        {...form.register("name")}
      />
      {form.formState.errors.name && (
        <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
      )}
    </Field>
  </>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/routes/cadastro.tsx
git commit -m "feat(web): add CPF field and split name/teamName by role in cadastro"
```

---

### Task 7: Write API tests

**Files:**
- Modify or create: `apps/api/tests/routes/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Add these test cases to the sign-up describe block in `apps/api/tests/routes/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, extractSessionCookie } from "../helpers/auth-helpers.js"
import { eq } from "drizzle-orm"
import { users, teams } from "../../src/db/schema/index.js"

describe("POST /api/auth/sign-up/email — F1 CPF + role fields", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it("F1-01: rejects sign-up with CPF missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: `cpf-missing-${Date.now()}@example.com`,
        password: "Password123!",
        name: "Test User",
        role: "player",
        // cpf intentionally omitted
      },
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })

  it("F1-02: rejects sign-up with CPF that is not 11 digits", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: `cpf-bad-${Date.now()}@example.com`,
        password: "Password123!",
        name: "Test User",
        role: "player",
        cpf: "123",
      },
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })

  it("F1-03: player sign-up with valid CPF succeeds", async () => {
    const cpf = `${Date.now()}`.slice(-11).padStart(11, "0")
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: `player-cpf-${Date.now()}@example.com`,
        password: "Password123!",
        name: "Player Test",
        role: "player",
        cpf,
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // CPF should not be exposed in the response
    expect(body.user?.cpf).toBeUndefined()
  })

  it("F1-04: team sign-up creates team with teamName and responsibleName", async () => {
    const cpf = `${Date.now() + 1}`.slice(-11).padStart(11, "0")
    const email = `team-f1-${Date.now()}@example.com`
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email,
        password: "Password123!",
        name: "João Responsável",
        role: "team",
        cpf,
        teamName: "Flamengo do Bairro",
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const userId: string = body.user?.id
    expect(userId).toBeDefined()

    // Verify team record was created with correct name and responsible_name
    const teamRecord = await (app as any).db.query.teams.findFirst({
      where: eq(teams.userId, userId),
    })
    expect(teamRecord).toBeDefined()
    expect(teamRecord?.name).toBe("Flamengo do Bairro")
    expect(teamRecord?.responsibleName).toBe("João Responsável")
  })

  it("F1-05: duplicate CPF returns 409", async () => {
    const cpf = `${Date.now() + 2}`.slice(-11).padStart(11, "0")
    const base = { password: "Password123!", name: "Test", role: "player", cpf }

    await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: `first-${Date.now()}@example.com`, ...base },
    })

    const second = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: `second-${Date.now()}@example.com`, ...base },
    })
    expect(second.statusCode).toBe(409)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (F1-03 and F1-04 will fail until implementation is in place)**

```bash
cd apps/api && npx vitest run tests/routes/auth.test.ts
```

Expected: some tests fail because CPF is not yet stored / Better Auth doesn't know about it yet (implementation from Tasks 1-6 is needed first).

- [ ] **Step 3: Run all tests after implementation to verify they pass**

```bash
cd apps/api && npx vitest run tests/routes/auth.test.ts
```

Expected: all 5 F1 tests pass.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
cd apps/api && npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/routes/auth.test.ts
git commit -m "test(auth): add F1 CPF and role-split sign-up tests"
```

---

## Self-Review Checklist

- [ ] CPF stored in `users` table with UNIQUE constraint
- [ ] `responsible_name` stored in `teams` table (camelCase: `responsibleName` in Drizzle)
- [ ] `teamName` used as team's `name` in DB — not stored in users table
- [ ] Better Auth validates `cpf` format before creation (via contract schema, not Better Auth itself)
- [ ] Frontend shows CPF for all roles, name splits by role
- [ ] Sign-up with `role=team` and no `teamName` fails validation (Zod refine)
- [ ] Duplicate CPF returns 409 (DB UNIQUE constraint, Better Auth should translate the error)
- [ ] `cpf` not exposed in login/sign-up response body (stripped by auth plugin if needed)
