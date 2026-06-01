import { pgTable, text, timestamp, index, unique, pgEnum } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const connectionStatusEnum = pgEnum("connection_status", ["pending", "accepted", "declined"])

export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: connectionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("connections_requester_id_idx").on(t.requesterId),
    index("connections_receiver_id_idx").on(t.receiverId),
    index("connections_status_idx").on(t.status),
    unique("connections_pair_unique").on(t.requesterId, t.receiverId),
  ]
)
