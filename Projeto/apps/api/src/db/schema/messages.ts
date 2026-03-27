import { pgTable, text, timestamp, bigserial, index, boolean } from "drizzle-orm/pg-core"
import { conversations } from "./conversations.js"
import { users } from "./users.js"

export const messages = pgTable("messages", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  senderId: text("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("messages_conversation_id_idx").on(t.conversationId),
])
