import { pgTable, text, timestamp, bigserial, index } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const profileViews = pgTable("profile_views", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  /** The user who viewed (team or player) */
  viewerId: text("viewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** The player whose profile was viewed */
  playerUserId: text("player_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("profile_views_player_idx").on(t.playerUserId),
  index("profile_views_viewer_idx").on(t.viewerId),
])
