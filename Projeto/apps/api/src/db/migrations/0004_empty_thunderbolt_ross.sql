CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "match_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_invites_match_player_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "match_invites" ADD CONSTRAINT "match_invites_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_invites" ADD CONSTRAINT "match_invites_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_invites_match_id_idx" ON "match_invites" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_invites_player_id_idx" ON "match_invites" USING btree ("player_id");