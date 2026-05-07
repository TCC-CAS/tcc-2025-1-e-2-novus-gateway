import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey().notNull(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'player_avatar', 'team_logo'
  entityId: text("entity_id"),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  thumbnailUrl: text("thumbnail_url"),
  mediumUrl: text("medium_url"),
  originalUrl: text("original_url"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})
