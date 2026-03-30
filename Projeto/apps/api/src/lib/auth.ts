import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { nanoid } from "nanoid"
import * as schema from "../db/schema/index.js"

let _auth: ReturnType<typeof betterAuth> | undefined
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function getAuth() {
  if (!_auth) {
    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client, { schema })
    _db = db
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
      trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:5173"],
      emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }) => {
          // AUTH-03: stub — log to console instead of sending email
          console.log(`[PASSWORD RESET] email=${user.email} token=${token} url=${url}`)
        },
      },
      plugins: [],
      user: {
        additionalFields: {
          role: {
            type: "string",
            required: false,
            defaultValue: "player",
            input: true,
          },
        },
      },
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              const role = (user as Record<string, unknown>).role as string | undefined
              // Only "player" and "team" are valid public roles — coerce anything else to "player"
              const safeRole = role === "team" ? "team" : "player"
              return { data: { ...user, role: safeRole } }
            },
            after: async (user) => {
              // Create a default profile row immediately on signup so GET /me never returns 404.
              // Onboarding will overwrite these defaults via PUT /me.
              const u = user as Record<string, unknown>
              const role = u.role as string
              const userId = u.id as string
              const name = (u.name as string | undefined) ?? ""
              if (!_db) return
              if (role === "player") {
                await _db
                  .insert(schema.players)
                  .values({ id: nanoid(), userId, name })
                  .onConflictDoNothing()
              } else if (role === "team") {
                await _db
                  .insert(schema.teams)
                  .values({ id: nanoid(), userId, name, level: "outro" })
                  .onConflictDoNothing()
              }
            },
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
    }) as unknown as ReturnType<typeof betterAuth>
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
