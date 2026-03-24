import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const teamLevelEnum = pgEnum("team_level", ["amador", "recreativo", "semi-profissional", "outro"])

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  level: teamLevelEnum("level").notNull(),
  region: text("region"),
  city: text("city"),
  description: text("description"),
  openPositions: text("open_positions").array().notNull().default([]),
  matchDays: text("match_days").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
