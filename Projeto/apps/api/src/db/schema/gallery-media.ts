import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const galleryMedia = pgTable("gallery_media", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull().default("image"), // "image" | "video"
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  caption: text("caption"),
  isHighlight: boolean("is_highlight").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  mediumUrl: text("medium_url"),
  originalUrl: text("original_url"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
