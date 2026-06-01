import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core"
import { teams } from "./teams.js"
import { players } from "./players.js"

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.teamId, t.playerId)]
)
