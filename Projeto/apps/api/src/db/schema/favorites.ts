import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const favorites = pgTable(
  "favorites",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_favorite").on(table.userId, table.targetUserId),
  ]
)
