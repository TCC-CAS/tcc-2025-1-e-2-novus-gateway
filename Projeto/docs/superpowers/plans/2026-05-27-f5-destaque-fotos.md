# F5 — Destaque de Fotos de Perfil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move photo/avatar upload to the top of player and team profile edit forms, add visual CTA when no photo is set, and move the photo step to first position in onboarding.

**Architecture:** Frontend-only changes. No backend or contract changes. Three files touched: `jogador/perfil-editar.tsx`, `time/perfil-editar.tsx`, and `onboarding.tsx`. The existing `ImageUpload` component and upload flow are kept as-is — only position/presentation changes.

**Tech Stack:** React, Tailwind CSS (existing components)

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/web/app/routes/jogador/perfil-editar.tsx` |
| Modify | `apps/web/app/routes/time/perfil-editar.tsx` |
| Modify | `apps/web/app/routes/onboarding.tsx` |

---

### Task 1: Move photo field to top in jogador/perfil-editar.tsx

**Files:**
- Modify: `apps/web/app/routes/jogador/perfil-editar.tsx`

- [ ] **Step 1: Read the current form structure to locate the photo upload field**

```bash
grep -n "photoUrl\|photo_url\|ImageUpload\|FOTO\|foto\|avatar" apps/web/app/routes/jogador/perfil-editar.tsx
```

This shows which line the photo section is on and what it's currently called.

- [ ] **Step 2: Move the photo section to the top of the form**

Find the JSX block that renders the `ImageUpload` (or equivalent) for the player photo. Cut the entire block (typically a `<div>` or `<Field>` containing the photo upload component) and paste it as the first child of the form's content area — above all other fields.

The photo section after moving should look like this (exact markup may differ from what you see in the file):

```tsx
{/* FOTO — sempre no topo */}
<div className="flex flex-col items-center mb-6">
  {profile?.photoUrl ? (
    <div className="relative">
      <div className="size-24 rounded-full border-2 border-foreground overflow-hidden">
        <OptimizedImage
          src={profile.photoUrl}
          alt="Foto de perfil"
          className="size-full object-cover"
        />
      </div>
      {/* Keep the existing upload button as-is */}
    </div>
  ) : (
    <div className="size-24 rounded-full border-2 border-dashed border-foreground flex flex-col items-center justify-center text-center p-2 mb-2">
      <p className="text-xs font-bold uppercase leading-tight">ADICIONE SUA FOTO</p>
    </div>
  )}
  {/* Existing ImageUpload or upload trigger stays here */}
  {!profile?.photoUrl && (
    <p className="text-xs text-muted-foreground text-center mt-2 max-w-[200px]">
      Jogadores com foto recebem 3× mais contato
    </p>
  )}
</div>
```

If the existing upload component (`ImageUpload`) already handles the preview and the empty state, keep using it — just move the whole block to the top and add the CTA text below it when there's no photo.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/jogador/perfil-editar.tsx
git commit -m "feat(ux): move player photo to top of edit form with no-photo CTA"
```

---

### Task 2: Move logo field to top in time/perfil-editar.tsx

**Files:**
- Modify: `apps/web/app/routes/time/perfil-editar.tsx`

- [ ] **Step 1: Locate the logo upload field**

```bash
grep -n "logoUrl\|logo_url\|ImageUpload\|LOGO\|logo\|escudo" apps/web/app/routes/time/perfil-editar.tsx
```

- [ ] **Step 2: Move the logo section to the top of the form**

Same pattern as Task 1. Move the logo upload block to be the first content inside the form. Wrap the empty state in a dotted border with CTA text:

```tsx
{/* LOGO — sempre no topo */}
<div className="flex flex-col items-center mb-6">
  {profile?.logoUrl ? (
    <div className="size-24 border-2 border-foreground overflow-hidden">
      <OptimizedImage
        src={profile.logoUrl}
        alt="Logo do time"
        className="size-full object-cover"
      />
    </div>
  ) : (
    <div className="size-24 border-2 border-dashed border-foreground flex flex-col items-center justify-center text-center p-2 mb-2">
      <p className="text-xs font-bold uppercase leading-tight">ADICIONE O ESCUDO DO TIME</p>
    </div>
  )}
  {/* Existing ImageUpload or upload trigger stays here */}
  {!profile?.logoUrl && (
    <p className="text-xs text-muted-foreground text-center mt-2 max-w-[200px]">
      Times com escudo transmitem mais credibilidade
    </p>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/time/perfil-editar.tsx
git commit -m "feat(ux): move team logo to top of edit form with no-logo CTA"
```

---

### Task 3: Move photo step to first position in onboarding.tsx

**Files:**
- Modify: `apps/web/app/routes/onboarding.tsx`

- [ ] **Step 1: Read the current onboarding step arrays**

```bash
grep -n "PLAYER_STEPS\|TEAM_STEPS\|step\|FOTO\|foto\|photoUrl\|PHOTO" apps/web/app/routes/onboarding.tsx | head -30
```

The current step arrays from the codebase are:

```typescript
const PLAYER_STEPS = [
  "BEM-VINDO",
  "POSIÇÃO E HABILIDADES",
  "DADOS FÍSICOS",
  "TUDO PRONTO",
] as const

const TEAM_STEPS = [
  "BEM-VINDO",
  "DADOS DO TIME",
  "POSIÇÕES ABERTAS",
  "TUDO PRONTO",
] as const
```

- [ ] **Step 2: Add "FOTO DE PERFIL" step as step index 1 (after BEM-VINDO)**

Update both arrays:

```typescript
const PLAYER_STEPS = [
  "BEM-VINDO",
  "FOTO DE PERFIL",
  "POSIÇÃO E HABILIDADES",
  "DADOS FÍSICOS",
  "TUDO PRONTO",
] as const

const TEAM_STEPS = [
  "BEM-VINDO",
  "FOTO DE PERFIL",
  "DADOS DO TIME",
  "POSIÇÕES ABERTAS",
  "TUDO PRONTO",
] as const
```

- [ ] **Step 3: Add photo state variables**

Add photo state near the top of the component's state declarations:

```typescript
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
```

- [ ] **Step 4: Add the photo step JSX**

Find where the component renders different step content (there's likely a big if/else or switch on `step` index). Add the photo step as `step === 1` (shifting all other step indices by 1):

For players (when `role === "player"` and `step === 1`):

```tsx
{/* Step 1: FOTO DE PERFIL */}
{role === "player" && step === 1 && (
  <div className="flex flex-col items-center gap-4">
    <h2 className="text-xl font-black uppercase">FOTO DE PERFIL</h2>
    <p className="text-sm text-muted-foreground text-center max-w-xs">
      Jogadores com foto recebem 3× mais contato de times
    </p>

    <div className="size-28 rounded-full border-2 border-dashed border-foreground flex items-center justify-center overflow-hidden">
      {photoPreview ? (
        <img src={photoPreview} alt="Preview" className="size-full object-cover rounded-full" />
      ) : (
        <User className="size-10 text-muted-foreground" />
      )}
    </div>

    <label className="cursor-pointer">
      <span className="border-2 border-foreground px-4 py-2 font-bold uppercase text-sm hover:bg-accent transition-colors">
        {photoPreview ? "TROCAR FOTO" : "ESCOLHER FOTO"}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setPhotoFile(file)
            setPhotoPreview(URL.createObjectURL(file))
          }
        }}
      />
    </label>

    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={() => setStep((s) => s + 1)}
    >
      Pular por enquanto
    </Button>
  </div>
)}
```

Repeat for `role === "team"` and `step === 1` (identical UI, different copy: "ESCUDO DO TIME").

- [ ] **Step 5: Handle photo upload on completion step or on "TUDO PRONTO"**

In the final step ("TUDO PRONTO") handler or the completion function, add photo upload if a file was selected:

```typescript
  async function handleComplete() {
    // ... existing logic ...

    // Upload photo if selected
    if (photoFile) {
      try {
        const formData = new FormData()
        formData.append("file", photoFile)
        await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}/upload`, {
          method: "POST",
          credentials: "include",
          body: formData,
        }).then(async (res) => {
          if (res.ok) {
            const { url } = await res.json()
            if (role === "player") {
              await playersApi.upsert({ photoUrl: url } as any)
            } else {
              await teamsApi.upsert({ logoUrl: url } as any)
            }
          }
        })
      } catch {
        // Photo upload is optional — don't block completion
      }
    }

    navigate(getHomeForRole(role))
  }
```

Note: If the existing onboarding already has an upload step somewhere, integrate with that instead of adding a separate upload call. The important thing is that completing onboarding with a selected photo actually uploads it.

- [ ] **Step 6: Verify step count still works (progress indicator)**

The progress indicator uses `PLAYER_STEPS.length` or `TEAM_STEPS.length`. Since we added a step, the total count increases by 1 automatically. Verify the progress bar or step counter renders correctly with 5 steps instead of 4.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/routes/onboarding.tsx
git commit -m "feat(ux): add photo step as step 1 in onboarding for both roles"
```

---

## Self-Review Checklist

- [ ] Player photo field is the **first** thing seen in `jogador/perfil-editar.tsx`
- [ ] Team logo field is the **first** thing seen in `time/perfil-editar.tsx`
- [ ] When no photo: dashed border + CTA text (not blank space)
- [ ] CTA text for player: "ADICIONE SUA FOTO — jogadores com foto recebem 3x mais contato"
- [ ] CTA text for team: "ADICIONE O ESCUDO DO TIME"
- [ ] Onboarding: "FOTO DE PERFIL" is step 2 (index 1), right after "BEM-VINDO"
- [ ] Onboarding: "Pular por enquanto" skips the photo step without error
- [ ] Onboarding: selecting a photo shows inline preview before saving
- [ ] Uploading works and preview appears before form submit
- [ ] No backend changes — `photoUrl`/`logoUrl` fields remain nullable in DB
- [ ] All three files compile without TypeScript errors
