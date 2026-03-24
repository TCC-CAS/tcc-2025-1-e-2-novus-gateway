import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core"
import { users } from "./users"

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  participantA: text("participant_a").notNull().references(() => users.id),
  participantB: text("participant_b").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("unique_participants").on(t.participantA, t.participantB),
])
