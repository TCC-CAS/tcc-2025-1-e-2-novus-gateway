import { pgTable, text, date, time, timestamp, index } from "drizzle-orm/pg-core"
import { teams } from "./teams.js"

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    opponentName: text("opponent_name"),
    matchDate: date("match_date").notNull(),
    matchTime: time("match_time"),
    address: text("address"),
    venueName: text("venue_name"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    result: text("result"),
    status: text("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_team_id_idx").on(t.teamId),
    index("matches_match_date_idx").on(t.matchDate),
  ]
)
