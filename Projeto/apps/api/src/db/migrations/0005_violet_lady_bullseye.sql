CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connections_pair_unique" UNIQUE("requester_id","receiver_id")
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connections_requester_id_idx" ON "connections" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "connections_receiver_id_idx" ON "connections" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "connections_status_idx" ON "connections" USING btree ("status");