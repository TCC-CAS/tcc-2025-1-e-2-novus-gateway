import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("role", ["player", "team", "admin"])
export const planIdEnum = pgEnum("plan_id", ["free", "craque", "titular", "campeao"])

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  planId: planIdEnum("plan_id").notNull().default("free"),
  banned: text("banned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
