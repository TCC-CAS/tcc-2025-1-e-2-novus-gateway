---
phase: 3
slug: player-team-profiles
status: draft
shadcn_initialized: true
preset: new-york
created: 2026-03-24
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for player and team profile management. Frontend is complete; this spec defines the backend API contract expectations.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | new-york (slate base) |
| Component library | Radix UI + Base UI |
| Icon library | lucide-react |
| Font | Source Sans 3 (body), Bebas Neue (display) |

**Status**: Already initialized. All routes exist (`jogador/perfil`, `jogador/perfil-editar`, `time/perfil`, `time/perfil-editar`, `jogadores.$id`, `times.$id`). Backend must match contract shapes exactly.

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing, button borders |
| md | 16px | Default element spacing, input padding |
| lg | 24px | Section padding, content gaps |
| xl | 32px | Layout gaps, major section breaks |
| 2xl | 48px | Large section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: None. All layouts use 4px increments.

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 16px | 400 | 1.5 | Form inputs, profile descriptions |
| Label | 16px (display font) | 700 | 1.2 | Form labels, section headers (uppercase) |
| Heading | 24px (display font) | 700 | 1.2 | Section titles (uppercase, tracking-wide) |
| Display | 32-48px (display font) | 700 | 1.2 | Page titles (uppercase, tracking-wide) |

**Display font**: Bebas Neue with tight tracking (`tracking-widest` = 0.1em). All headings use uppercase and `font-display`.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | oklch(0.985 0.004 155) light / oklch(0.1 0.01 250) dark | Background, page surfaces |
| Secondary (30%) | oklch(0.94 0.02 160) light / oklch(0.25 0.02 230) dark | Card backgrounds, sidebar |
| Accent (10%) | oklch(0.52 0.14 160) light / oklch(0.65 0.16 160) dark | Primary CTA buttons, selected states |
| Destructive | oklch(0.6 0.22 15) light / oklch(0.7 0.19 22) dark | Error messages, delete confirmations |

**Accent reserved for**:
- Primary action buttons (SALVAR ALTERAÇÕES, ENVIAR, CONECTAR)
- Selected toggle states (positions, availability days)
- Hover/active states on navigational elements
- Form field focus rings

---

## Copywriting Contract

### Player Profile

| Element | Copy | Notes |
|---------|------|-------|
| Page title (edit) | EDITAR PERFIL | font-display, tracking-widest, uppercase |
| Page subtitle | MANTENHA SEU CARTÃO DE VISITAS ATUALIZADO NO MERCADO DA VÁRZEA | All caps, muted-foreground |
| Section: Basic Info | DADOS BÁSICOS / QUEM É VOCÊ NA PELADA | Two-line format: title + description |
| Section: Positions | ÁREA DE ATUAÇÃO | Single-line section title |
| Section: Skills | ARSENAL / NO QUE VOCÊ SE DESTACA | Two-line format |
| Section: Physical | ATRIBUTOS FÍSICOS | Single-line |
| Section: Availability | AGENDA / QUANDO VOCÊ PODE JOGAR | Two-line format |
| Primary CTA | SALVAR ALTERAÇÕES | With Save icon, full width on mobile, flex-1 on desktop |
| Secondary CTA | CANCELAR | Outline variant, text-foreground |
| Success toast | Perfil atualizado! | Via sonner toast.success() |
| Error toast | {ApiError.message} fallback to "Erro ao salvar." | Via sonner toast.error() |
| Field: Name | NOME EM CAMPO | Label with uppercase, tracking-wide |
| Field: Bio | SOBRE VOCÊ | Textarea, 4 rows |
| Field: Phone | WHATSAPP (OPCIONAL) | Placeholder: (11) 99999-9999, font-mono |
| Field: Height | ALTURA (CM) | Numeric input, placeholder: 175 |
| Field: Weight | PESO (KG) | Numeric input, placeholder: 75 |
| Field: Birth Date | DATA DE NASCIMENTO | Date input type |
| Positions label | {POSITION_LABEL} per POSITIONS enum | goleiro, lateral, zagueiro, volante, meia, atacante → uppercase display |
| Position button (unselected) | border-foreground, bg-muted/30, hover state: border-primary + shadow + translate-y-1 |
| Position button (selected) | border-primary, bg-primary, Check icon visible, shadow effect, translate-y-1 |
| Skills input | Ex.: drible, passe longo, finalização, raça | Comma-separated, rendered as tags |
| Skills tag | {skill} with X button to remove | border-2 border-foreground, bg-foreground, text-background |
| Availability button (unselected) | border-foreground, bg-muted/30, hover state |
| Availability button (selected) | border-primary, bg-primary, text-primary-foreground, -translate-y-1 |
| Loading state | PREPARANDO VESTIÁRIO... | font-display, text-2xl, animate-pulse, text-primary |

### Team Profile

| Element | Copy | Notes |
|---------|------|-------|
| Page title (edit) | EDITAR PERFIL | Same as player |
| Section: Basic Info | DADOS DO TIME | Two-line: DADOS DO TIME / {subtitle} |
| Section: Level | CATEGORIA / QUAL É O NÍVEL DO TIME | Two-line format |
| Section: Positions | POSIÇÕES ABERTAS | Single-line |
| Section: Schedule | AGENDA / QUANDO VOCÊS JOGAM | Two-line format |
| Primary CTA | SALVAR ALTERAÇÕES | Same button as player |
| Secondary CTA | CANCELAR | Same button as player |
| Success toast | Perfil atualizado! | Same as player |
| Error toast | {ApiError.message} fallback to "Erro ao salvar." | Same as player |
| Field: Name | NOME DO TIME | Placeholder: Ex.: Santos FC |
| Field: Description | SOBRE O TIME | Textarea, 4 rows |
| Field: Region | REGIÃO / ESTADO | Optional, e.g. "SP" |
| Field: City | CIDADE | Optional, e.g. "São Paulo" |
| Level button (unselected) | border-foreground, bg-muted/30, hover state |
| Level button (selected) | border-primary, bg-primary, Check icon, -translate-y-1 |
| TEAM_LEVELS enum | amador, recreativo, semi-profissional, outro → uppercase display |
| Positions tag | Same as player skills (comma-separated input) |
| Match days | Same as player availability (day selection buttons) |

### Public Profiles (View-Only)

| Element | Copy | Notes |
|---------|------|-------|
| No profile yet | PERFIL NÃO CONCLUÍDO | Centered, muted, prompt to "Editar Perfil" |
| CTA (view public profile) | VISITAR PERFIL | Button linking to public profile (jogadores.$id / times.$id) |
| Profile header | {name} | Player/Team name as page title |
| Section headers | Same brutalist pattern: uppercase, display font, border-b-4 |

---

## Form Validation

All forms use `react-hook-form` + `zodResolver` with schemas from `~shared/contracts`:
- `UpsertPlayerProfileRequestSchema` (players.ts)
- `UpsertTeamProfileRequestSchema` (teams.ts)

Error display:
- Inline below field: `<p className="text-sm font-bold tracking-widest text-destructive uppercase">`
- Extracted from `form.formState.errors.{fieldName}?.message`

---

## Sections Layout

All major form sections follow this pattern:

```
┌─────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │ SECTION TITLE                        │ │
│ │ optional-subtitle-in-caps             │ │
│ │ border-b-4 border-foreground         │ │
│ └──────────────────────────────────────┘ │
│                                           │
│ border-4 border-foreground                │
│ bg-background                            │
│ shadow-[8px_8px_0px_0px_var(...)]       │
│ p-6                                      │
│                                           │
│ [Form fields in space-y-6]              │
└─────────────────────────────────────────┘
```

Decorative elements:
- Top-left blur circle on edit pages: `rounded-full bg-primary/20 blur-[100px] h-64 w-64`
- Absolute positioned, `pointer-events-none`, `z-0` behind content
- Corner decorations on some sections: `absolute right-0 top-0 w-24 h-24 bg-primary/10 border-l-4 border-b-4`

---

## Button States

### Primary (Save/Submit)

```
Default:
  border-2 border-primary bg-primary text-primary-foreground
  h-14 py-3 px-8 rounded-none
  font-display text-2xl tracking-widest uppercase

Hover:
  -translate-y-1 shadow-[4px_4px_0px_0px_var(--color-foreground)]

Disabled:
  opacity-50 hover:translate-y-0 hover:shadow-none
```

### Secondary (Cancel)

```
Default:
  border-2 border-foreground bg-background text-foreground
  h-14 py-3 px-8 rounded-none
  font-display text-xl tracking-widest uppercase

Hover:
  bg-muted/50

Active:
  None (outline variant)
```

---

## Input & Textarea Styles

All inputs use:

```
h-14 (inputs) / rows-4 (textarea)
rounded-none (brutalist, no curves)
border-2 border-foreground
bg-muted/50
px-4 (inputs) / p-4 (textarea)
text-lg
focus-visible:ring-0
focus-visible:border-primary
transition-colors
```

Optional hint text below inputs:
```
text-xs font-bold tracking-widest text-muted-foreground uppercase opacity-70
```

---

## Toggle Buttons (Positions, Availability, Team Levels)

Unselected state:
```
border-2 border-foreground
bg-muted/30
text-foreground
hover:border-primary
hover:-translate-y-1
hover:shadow-[4px_4px_0px_0px_var(--color-primary)]
```

Selected state:
```
border-2 border-primary
bg-primary
text-primary-foreground
shadow-[4px_4px_0px_0px_var(--color-foreground)]
-translate-y-1
[Check icon visible inside]
```

---

## Backend API Contract Expectations

### Player Profile Endpoints

**GET /players/me**

Response shape (from `PlayerProfileSchema`):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "string",
  "photoUrl": "url (optional)",
  "positions": ["goleiro" | "lateral" | ...],
  "bio": "string (optional)",
  "skills": ["string"],
  "height": "number (cm, optional)",
  "weight": "number (kg, optional)",
  "birthDate": "ISO date (optional)",
  "phone": "brazilian phone format (optional)",
  "availability": "comma-separated day list (optional)",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

Wrapped in: `{ data: PlayerProfile }`

**PUT /players/me**

Request body (from `UpsertPlayerProfileRequestSchema`):
```json
{
  "name": "string (min 2 chars)",
  "photoUrl": "url (optional) or empty string",
  "positions": ["position", ...] (min 1),
  "bio": "string (optional)",
  "skills": ["string"],
  "height": "integer 100-250 (optional)",
  "weight": "integer 30-200 (optional)",
  "birthDate": "ISO date (optional)",
  "phone": "brazilian phone format (optional)",
  "availability": "comma-separated string (optional)"
}
```

Response: Same as GET /players/me

**GET /players/:id**

Query param: `id` (string, UUID)

Response: Same as GET /players/me (public profile)

### Team Profile Endpoints

**GET /teams/me**

Response shape (from `TeamProfileSchema`):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "string",
  "logoUrl": "url (optional)",
  "level": "amador" | "recreativo" | "semi-profissional" | "outro",
  "region": "string (optional)",
  "city": "string (optional)",
  "description": "string (optional)",
  "openPositions": ["string"],
  "matchDays": ["string"] (optional),
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

Wrapped in: `{ data: TeamProfile }`

**PUT /teams/me**

Request body (from `UpsertTeamProfileRequestSchema`):
```json
{
  "name": "string (min 2 chars)",
  "logoUrl": "url (optional) or empty string",
  "level": "amador" | "recreativo" | "semi-profissional" | "outro",
  "region": "string (optional)",
  "city": "string (optional)",
  "description": "string (optional)",
  "openPositions": ["string"],
  "matchDays": ["string"] (optional)
}
```

Response: Same as GET /teams/me

**GET /teams/:id**

Query param: `id` (string, UUID)

Response: Same as GET /teams/me (public profile)

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Button, Input, Textarea, Label | not required |

**Third-party registries**: None declared.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Implementation Notes

**Key Constraints**:
1. All form data validated via Zod schemas from `~shared/contracts` — no frontend-only validation.
2. Backend responses MUST match contract shapes exactly (TypeScript inferred from Zod).
3. Error messages from API passed to sonner toast.error() — no custom error UI.
4. Loading states use `animate-pulse` with muted-foreground text.
5. Form sections are independent; order matches the design (Basic → Positions → Skills → Physical → Availability).
6. All buttons and inputs are `rounded-none` (brutalist, no border-radius).
7. All headings use `font-display` with `tracking-widest` and uppercase.
8. Image URLs (`photoUrl`, `logoUrl`) are optional but must be valid URLs if provided.

**Frontend Dependencies**:
- `react-hook-form` 7.71 (form state)
- `@hookform/resolvers` 5.2 (Zod validation)
- `@tanstack/react-query` 5.90 (server state)
- `sonner` 2.0 (toast notifications)
- `lucide-react` 0.563 (icons)
- `tailwind-merge` 3.4 + `clsx` 2.1 (class utilities)

---

*Created: 2026-03-24*
*Last updated: 2026-03-24*
