# Track 1 Phase 1D — Email + Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace console.log email sends with Resend, add email verification flow via Better Auth, and create 3 email templates.

**Architecture:** Abstract email sending behind an `EmailService` interface. Resend handles delivery. Better Auth's emailVerification plugin handles the verification flow. Frontend shows verification prompt after signup.

**Tech Stack:** Resend (`resend` npm package), Better Auth emailVerification plugin, React 19

**Prerequisites:** Resend account created at https://resend.com, API key obtained

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/lib/email/service.ts` | Create | EmailService abstraction |
| `apps/api/src/lib/email/templates/reset-password.ts` | Create | Password reset template |
| `apps/api/src/lib/email/templates/email-verification.ts` | Create | Verification template |
| `apps/api/src/lib/email/templates/welcome.ts` | Create | Welcome template |
| `apps/api/src/lib/email/index.ts` | Create | Barrel export |
| `apps/api/src/lib/auth.ts` | Modify | Enable emailVerification plugin |
| `apps/api/package.json` | Modify | Add resend dependency |

---

## Task 1: Install Resend and create EmailService

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/lib/email/service.ts`
- Create: `apps/api/src/lib/email/index.ts`

- [ ] **Step 1: Install Resend**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && pnpm add resend`

- [ ] **Step 2: Add environment variable**

Add to `.env.example`:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

- [ ] **Step 3: Create EmailService**

```typescript
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"

export interface EmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
  sendWelcome(to: string, name: string): Promise<void>
}

export const emailService: EmailService = {
  async sendPasswordReset(to: string, resetUrl: string) {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "VárzeaPro — Redefinir senha",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">Redefinir Senha</h1>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">REDEFINIR SENHA</a>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
        </div>
      `,
    })
  },

  async sendEmailVerification(to: string, verifyUrl: string) {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "VárzeaPro — Verifique seu email",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">Verifique Seu Email</h1>
          <p>Clique no link abaixo para verificar seu endereço de email.</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">VERIFICAR EMAIL</a>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Se você não criou uma conta no VárzeaPro, ignore este email.</p>
        </div>
      `,
    })
  },

  async sendWelcome(to: string, name: string) {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Bem-vindo ao VárzeaPro, ${name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">BEM-VINDO, ${name}!</h1>
          <p>Sua conta no VárzeaPro foi criada com sucesso.</p>
          <p>Complete seu perfil para começar a encontrar times e jogadores.</p>
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/onboarding" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">CONFIGURAR PERFIL</a>
        </div>
      `,
    })
  },
}
```

- [ ] **Step 4: Create barrel export**

```typescript
export { emailService } from "./service.js"
export type { EmailService } from "./service.js"
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/email/ apps/api/package.json
git commit -m "feat: add Resend email service with templates"
```

---

## Task 2: Wire EmailService into Better Auth

**Files:**
- Modify: `apps/api/src/lib/auth.ts`

- [ ] **Step 1: Replace console.log with emailService calls**

In `apps/api/src/lib/auth.ts`, import the emailService and replace the `sendResetPassword` callback:

```typescript
import { emailService } from "./email/index.js"
```

Replace the `sendResetPassword` callback:

```typescript
      sendResetPassword: async ({ user, url, token }) => {
        await emailService.sendPasswordReset(user.email, url)
      },
```

- [ ] **Step 2: Enable emailVerification plugin**

Add to the `plugins` array in the Better Auth config:

```typescript
    plugins: [
      import("better-auth/email-verification").then(m => m.emailVerification({
        sendVerificationEmail: async ({ user, url }) => {
          await emailService.sendEmailVerification(user.email, url)
        },
        sendResetPassword: async ({ user, url }) => {
          await emailService.sendPasswordReset(user.email, url)
        },
      })),
    ],
```

Note: Check Better Auth docs for the exact emailVerification plugin API. The import path and configuration may differ. Verify at https://www.better-auth.com/docs/plugins/email-verification.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/auth.ts
git commit -m "feat: wire Resend email service into Better Auth, enable email verification"
```

---

## Task 3: Add frontend verification prompt

**Files:**
- Modify: `apps/web/app/routes/onboarding.tsx` (or signup flow)

- [ ] **Step 1: Show verification banner after signup**

After the user completes onboarding, show a toast or banner encouraging email verification:

```typescript
toast.success("Perfil configurado! Verifique seu email para ativar todas as funcionalidades.")
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/routes/onboarding.tsx
git commit -m "feat: add email verification prompt after onboarding"
```
