import { Resend } from "resend"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"

function logDevEmail(method: string, to: string, extra?: Record<string, string>) {
  console.log(`[email:dev] ${method} → ${to}`, extra ?? "")
}

export interface EmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
  sendWelcome(to: string, name: string): Promise<void>
}

export const emailService: EmailService = {
  async sendPasswordReset(to: string, resetUrl: string) {
    if (!resend) { logDevEmail("sendPasswordReset", to, { resetUrl }); return }
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
    if (!resend) { logDevEmail("sendEmailVerification", to, { verifyUrl }); return }
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
    if (!resend) { logDevEmail("sendWelcome", to, { name }); return }
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Bem-vindo(a) ao VárzeaPro, ${name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">BEM-VINDO(A), ${name}!</h1>
          <p>Sua conta no VárzeaPro foi criada com sucesso.</p>
          <p>Complete seu perfil para começar a encontrar times e jogadores.</p>
          <a href="${process.env.CORS_ORIGIN || "http://localhost:5173"}/onboarding" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">CONFIGURAR PERFIL</a>
        </div>
      `,
    })
  },
}
