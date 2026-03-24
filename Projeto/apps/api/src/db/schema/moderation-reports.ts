import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { users } from "./users"

export const reportedEntityTypeEnum = pgEnum("reported_entity_type", ["player", "team", "message"])
export const reportReasonEnum = pgEnum("report_reason", ["inappropriate", "spam", "harassment", "fake", "other"])
export const reportStatusEnum = pgEnum("report_status", ["pending", "dismissed", "resolved"])

export const moderationReports = pgTable("moderation_reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  reportedEntityType: reportedEntityTypeEnum("reported_entity_type").notNull(),
  reportedEntityId: text("reported_entity_id").notNull(),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
