# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**
- Route files: kebab-case with Portuguese names matching URL segments (e.g., `buscar-jogadores.tsx`, `perfil-editar.tsx`)
- Layout files: prefixed with underscore + kebab-case descriptor (e.g., `_authenticated-layout.tsx`, `_player-layout.tsx`, `_admin-layout.tsx`)
- Dynamic route files: dot-separated param syntax (e.g., `jogadores.$id.tsx`, `usuarios.$id.tsx`)
- Component files: kebab-case (e.g., `app-shell.tsx`, `button-group.tsx`)
- Library/utility files: kebab-case (e.g., `auth-context.tsx`, `api-client.ts`, `route-guards.ts`)
- Hook files: `use-` prefix in kebab-case (e.g., `use-mobile.ts`)
- Contract files: domain-noun kebab-case (e.g., `auth.ts`, `players.ts`, `teams.ts`)

**Functions and Hooks:**
- React components: PascalCase (e.g., `AuthProvider`, `MockBootstrap`, `JogadorHome`)
- Custom hooks: camelCase with `use` prefix (e.g., `useAuth`, `useAuthState`, `useAuthActions`, `useRole`, `useNavItems`)
- Regular functions: camelCase (e.g., `onSubmit`, `authHeaders`, `getAuthToken`, `setAuthToken`)
- API namespace objects: camelCase with `Api` suffix (e.g., `authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`)
- Handler arrays: camelCase with `Handlers` suffix (e.g., `authHandlers`, `playersHandlers`, `teamsHandlers`)
- Fixture objects: camelCase with `mock` prefix (e.g., `mockPlayerProfiles`, `mockTeamSummaries`, `mockUsers`)

**Variables:**
- camelCase throughout
- Constants: SCREAMING_SNAKE_CASE for module-level fixed values (e.g., `const API = "/api"`, `const PROFILE_STEPS`, `const PROFILE_COMPLETED`)

**Types and Schemas:**
- Zod schemas: PascalCase with `Schema` suffix (e.g., `LoginRequestSchema`, `RoleSchema`, `SessionUserSchema`)
- Inferred types: `type Foo = z.infer<typeof FooSchema>` — same name without `Schema` suffix
- Type aliases: PascalCase (e.g., `AuthState`, `AuthActions`, `Role`, `SessionUser`)
- Context split pattern: state context and actions context as separate named contexts (e.g., `AuthStateContext`, `AuthActionsContext`)

## Code Style

**Formatting:**
- No Prettier or ESLint config files detected — formatting appears consistent but not enforced by tooling config
- Semicolons: omitted (no trailing semicolons in most files; some files use them in imports)
- Quotes: double quotes for strings
- Indentation: 2 spaces

**TypeScript:**
- Strict typing throughout; uses `z.infer` to derive types from Zod schemas
- `import type` used for type-only imports (e.g., `import type { SessionUser } from "~shared/contracts"`)
- Inline `import()` for type references inside function signatures when avoiding circular imports (e.g., in `api-client.ts`)
- Type assertions used carefully with `as` keyword where needed

## Import Organization

**Order observed:**
1. React and framework imports (`react`, `react-router`)
2. Third-party libraries (`react-hook-form`, `@hookform/resolvers/zod`, `sonner`, `lucide-react`)
3. Shared contracts (`~shared/contracts`)
4. Internal lib imports (`~/lib/...`)
5. Internal component imports (`~/components/...`)
6. Relative mock/fixture imports (when used directly in routes)

**Path Aliases:**
- `~/` — maps to `app/` directory (internal app code)
- `~shared/` — maps to `shared/` directory (contracts and shared types)

## Error Handling

**Patterns:**
- API calls wrapped in `try/catch/finally` blocks in form submit handlers
- `ApiError` class (from `~/lib/api-client`) checked with `instanceof` to distinguish API errors from generic errors
- User-facing error messages shown via `sonner` toast: `toast.error(message)`
- Fallback message string provided for non-ApiError cases
- `finally` block always used to reset loading state

**Example pattern from `app/routes/login.tsx`:**
```typescript
try {
  const res = await authApi.login(data);
  // success path
} catch (e) {
  const message =
    e instanceof ApiError ? e.message : "Erro ao entrar. Tente novamente.";
  toast.error(message);
} finally {
  setIsSubmitting(false);
}
```

## API Client Pattern

- Single `request<T>()` generic function in `app/lib/api-client.ts` handles all HTTP
- Domain-scoped API objects group related endpoints (e.g., `authApi`, `playersApi`)
- Auth header injected via `authHeaders()` helper on each call (not via interceptor)
- API error shape: `{ error: { code: string; message: string; details?: unknown[] } }`
- Response types imported inline from `~shared/contracts` to avoid top-level circular imports

## Forms

**Pattern:**
- `react-hook-form` with `zodResolver` for all form validation
- Zod schema imported from `~shared/contracts` (co-located with inferred type)
- Form errors rendered inline below each field with `form.formState.errors.fieldName?.message`
- Submit state tracked with local `useState<boolean>` (`isSubmitting`)

**Example:**
```typescript
const form = useForm<LoginRequest>({
  resolver: zodResolver(LoginRequestSchema),
  defaultValues: { email: "", password: "" },
});
```

## Context Pattern

**Split state/actions contexts:**
- State context and actions context created separately to allow consumers to subscribe only to what they need
- Both exposed via a combined `useAuth()` hook for convenience
- Context consumers throw `Error` with descriptive message if used outside provider

```typescript
const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

export function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error("useAuthState must be used within AuthProvider");
  return ctx;
}
```

## Component Design

**UI Components:**
- Located in `app/components/ui/` — shadcn-style primitives
- Use `cn()` utility from `app/lib/utils.ts` for conditional Tailwind class merging

**`cn()` utility:**
```typescript
import { cn } from "~/lib/utils";
// Usage: className={cn("base-class", condition && "conditional-class")}
```

**Styling:**
- Tailwind CSS v4 utility classes used exclusively — no CSS modules or styled-components
- Brutalist design system: `rounded-none`, heavy border/shadow patterns, uppercase typography
- Theme tokens referenced as CSS variables: `var(--color-foreground)`, `var(--color-primary)`

## Logging

**Approach:** No structured logging; browser `console` only where needed. No logging library detected.

## Comments

**When to comment:**
- JSDoc-style block comments on module files (e.g., top of `api-client.ts` explains purpose)
- Section comments in large components using `{/* SECTION NAME */}` JSX comments
- Inline `//` comments for non-obvious logic

## Module Design

**Exports:**
- Named exports for everything except default route components
- Route components use `export default function ComponentName()`
- Barrel `index.ts` files used in lib subdirectories (e.g., `app/lib/auth/index.ts`, `app/lib/plan/index.ts`, `shared/contracts/index.ts`)
- Handler arrays spread into parent `handlers` array via barrel `mocks/handlers/index.ts`

---

*Convention analysis: 2026-03-23*
