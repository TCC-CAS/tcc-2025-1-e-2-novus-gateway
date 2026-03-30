import { pgTable, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("role", ["player", "team", "admin"])
export const planIdEnum = pgEnum("plan_id", ["free", "craque", "titular", "campeao"])

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
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
