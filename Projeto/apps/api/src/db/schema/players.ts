import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
