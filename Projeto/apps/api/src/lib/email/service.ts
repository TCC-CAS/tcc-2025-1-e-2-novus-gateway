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
  sendConnectionAccepted(to: string, acceptorName: string): Promise<void>
  sendMatchInviteAccepted(to: string, playerName: string, matchDate: string | null, teamName: string): Promise<void>
}

export const emailService: EmailService = {
  async sendPasswordReset(to: string, resetUrl: string) {
    if (!resend) { logDevEmail("sendPasswordReset", to, { resetUrl }); return }
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "VárzeaPro — Redefinir senha",
      html: emailBase("REDEFINIR SENHA", `
        <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
          Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.
        </p>
        ${emailButton(resetUrl, "REDEFINIR SENHA")}
      `),
    })
  },

  async sendEmailVerification(to: string, verifyUrl: string) {
    if (!resend) { logDevEmail("sendEmailVerification", to, { verifyUrl }); return }
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "VárzeaPro — Verifique seu email",
      html: emailBase("VERIFIQUE SEU EMAIL", `
        <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
          Clique no botão abaixo para confirmar seu endereço de email e ativar sua conta no VárzeaPro.
        </p>
        ${emailButton(verifyUrl, "VERIFICAR EMAIL")}
      `),
    })
  },

  async sendWelcome(to: string, name: string) {
    if (!resend) { logDevEmail("sendWelcome", to, { name }); return }
    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173"
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

  async sendConnectionAccepted(to: string, acceptorName: string) {
    if (!resend) { logDevEmail("sendConnectionAccepted", to, { acceptorName }); return }
    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173"
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `VárzeaPro — ${acceptorName} aceitou sua conexão!`,
      html: emailBase("NOVA CONEXÃO!", `
        <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
          <strong>${acceptorName}</strong> aceitou seu pedido de conexão no VárzeaPro. Vocês agora estão conectados.
        </p>
        ${emailButton(`${frontendUrl}/jogador/conexoes`, "VER CONEXÕES")}
      `),
    })
  },

  async sendMatchInviteAccepted(to: string, playerName: string, matchDate: string | null, teamName: string) {
    if (!resend) { logDevEmail("sendMatchInviteAccepted", to, { playerName, teamName, matchDate: matchDate ?? "" }); return }
    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173"
    const dateStr = matchDate ? new Date(matchDate).toLocaleDateString("pt-BR") : "data a confirmar"
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `VárzeaPro — ${playerName} aceitou o convite para o jogo!`,
      html: emailBase("CONVITE ACEITO!", `
        <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 8px;">
          <strong>${playerName}</strong> aceitou o convite para jogar pelo <strong>${teamName}</strong>.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
          Data do jogo: <strong>${dateStr}</strong>
        </p>
        ${emailButton(`${frontendUrl}/time/jogos`, "VER JOGOS")}
      `),
    })
  },
}

function emailBase(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:3px solid #000;box-shadow:6px 6px 0 #000;">
        <!-- Header -->
        <tr>
          <td style="background:#000;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;">VÁRZEAPRO</td>
                <td align="right" style="color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;">FUTEBOL DE VÁRZEA</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Accent bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#22c55e,#16a34a);"></td></tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#000;border-left:5px solid #22c55e;padding-left:16px;">${title}</h1>
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f5;border-top:2px solid #000;padding:20px 32px;">
            <p style="margin:0;color:#888;font-size:12px;letter-spacing:1px;">VárzeaPro · Futebol de Várzea · Brasil</p>
            <p style="margin:6px 0 0;color:#aaa;font-size:11px;">Se você não solicitou este email, ignore-o com segurança.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function emailButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 28px;background:#000;color:#fff;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:2px solid #000;transition:all .2s;">${label}</a>`
}
