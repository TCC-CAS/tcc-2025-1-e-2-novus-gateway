CREATE TYPE "public"."player_sex" AS ENUM('male', 'female', 'trans_male', 'trans_female', 'rather_not_say');--> statement-breakpoint
CREATE TYPE "public"."team_lineup_sex" AS ENUM('male', 'female');--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "sex" "player_sex" DEFAULT 'rather_not_say' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "lineup_sex" "team_lineup_sex" DEFAULT 'male' NOT NULL;