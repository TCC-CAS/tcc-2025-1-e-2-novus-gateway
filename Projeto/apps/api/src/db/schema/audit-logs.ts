import { pgTable, text, timestamp, bigserial } from "drizzle-orm/pg-core"
import { users } from "./users"

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetEntityType: text("target_entity_type"),
  targetEntityId: text("target_entity_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
