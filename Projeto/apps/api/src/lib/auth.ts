import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nanoid } from "nanoid"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "../db/schema/index.js"
import { emailService } from "./email/index.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Auth = ReturnType<typeof betterAuth<any>>

/**
 * Creates a Better Auth instance bound to the given Drizzle database.
 * Uses a single shared connection pool — no separate postgres client.
 */
export function createAuth(db: PostgresJsDatabase<typeof schema>) {
  return betterAuth({
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
    trustedOrigins: [
      process.env.CORS_ORIGIN ?? "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url, token }) => {
        // Always log in dev (when no email service configured)
        console.log(`[PASSWORD RESET] ${user.email}: ${token} — ${url}`)
        void emailService.sendPasswordReset(user.email, url)
      },
    },
    plugins: [],
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }) => {
        void emailService.sendEmailVerification(user.email, url)
      },
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
    },
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
            const safeRole = role === "team" ? "team" : "player"
            return { data: { ...user, role: safeRole } }
          },
          after: async (user) => {
            const u = user as Record<string, unknown>
            const role = u.role as string
            const userId = u.id as string
            const name = (u.name as string | undefined) ?? ""

            if (role === "player") {
              await db
                .insert(schema.players)
                .values({ id: nanoid(), userId, name })
                .onConflictDoNothing()
            } else if (role === "team") {
              await db
                .insert(schema.teams)
                .values({ id: nanoid(), userId, name, level: "outro" })
                .onConflictDoNothing()
            }

            void emailService.sendWelcome(u.email as string, name)
          },
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
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
