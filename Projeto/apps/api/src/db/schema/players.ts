import { pgTable, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core"
import type { CareerEntry, DetailedStats } from "../../../../../shared/contracts/players.js"
import { users } from "./users.js"

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  positions: text("positions").array().notNull().default([]),
  bio: text("bio"),
  skills: text("skills").array().notNull().default([]),
  height: integer("height"),
  weight: integer("weight"),
  birthDate: text("birth_date"),
  phone: text("phone"),
  availability: text("availability"),
  hidden: boolean("hidden").notNull().default(false),
  region: text("region"),
  city: text("city"),
  level: text("level"),
  careerHistory: json("career_history").$type<CareerEntry[]>().notNull().default([]),
  detailedStats: json("detailed_stats").$type<DetailedStats | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
