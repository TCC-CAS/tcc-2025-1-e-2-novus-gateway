import { pgTable, text, timestamp, index, unique, pgEnum } from "drizzle-orm/pg-core"
import { matches } from "./matches.js"
import { players } from "./players.js"

export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "declined"])

export const matchInvites = pgTable(
  "match_invites",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: inviteStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("match_invites_match_id_idx").on(t.matchId),
    index("match_invites_player_id_idx").on(t.playerId),
    unique("match_invites_match_player_unique").on(t.matchId, t.playerId),
  ]
)
