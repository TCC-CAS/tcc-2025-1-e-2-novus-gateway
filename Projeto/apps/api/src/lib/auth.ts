import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema/index.js"

let _auth: ReturnType<typeof betterAuth> | undefined

export function getAuth() {
  if (!_auth) {
    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client, { schema })
    _auth = betterAuth({
      database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true,
        schema: {
          users: schema.users,
          sessions: schema.sessions,
          accounts: schema.accounts,
          verifications: schema.verifications,
        },
      }),
      basePath: "/api/auth",
      emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }) => {
          // AUTH-03: stub — log to console instead of sending email
          console.log(`[PASSWORD RESET] email=${user.email} token=${token} url=${url}`)
        },
      },
      plugins: [admin()],
      databaseHooks: {
        user: {
          create: {
            before: async (user, ctx) => ({
              data: {
                ...user,
                role: (ctx?.body as Record<string, unknown>)?.role ?? "player",
              },
            }),
          },
        },
      },
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60, // 5 minutes cache
        },
      },
      advanced: {
        cookiePrefix: "varzeapro",
        defaultCookieAttributes: {
          httpOnly: true,
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
        },
      },
    })
  }
  return _auth
}

// Backward-compat proxy so existing imports of `auth` keep working
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    return (getAuth() as Record<string | symbol, unknown>)[prop]
  },
})

export type Auth = typeof auth
