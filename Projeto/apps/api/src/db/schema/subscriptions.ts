import { pgTable, text, timestamp, boolean, pgEnum, varchar } from "drizzle-orm/pg-core"
import { users } from "./users.js"
import { planIdEnum } from "./users.js"

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"])

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  planId: planIdEnum("plan_id").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  mercadopagoPreapprovalId: varchar("mercadopago_preapproval_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
