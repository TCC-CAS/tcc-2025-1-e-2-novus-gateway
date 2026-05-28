CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"opponent_name" text,
	"match_date" date NOT NULL,
	"match_time" time,
	"address" text,
	"venue_name" text,
	"neighborhood" text,
	"city" text,
	"result" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_team_id_idx" ON "matches" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "matches_match_date_idx" ON "matches" USING btree ("match_date");