CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");

CREATE TABLE "media_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "thumbnail_url" text,
  "medium_url" text,
  "original_url" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_user_id");
CREATE INDEX "media_assets_entity_idx" ON "media_assets" USING btree ("entity_type", "entity_id") WHERE "is_deleted" = false;
