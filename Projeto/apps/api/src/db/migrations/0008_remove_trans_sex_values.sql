-- Migrate trans_male → male, trans_female → female before removing those enum values
UPDATE "players" SET "sex" = 'male' WHERE "sex" = 'trans_male';
UPDATE "players" SET "sex" = 'female' WHERE "sex" = 'trans_female';

-- Recreate the enum without trans values
ALTER TYPE "public"."player_sex" RENAME TO "player_sex_old";
CREATE TYPE "public"."player_sex" AS ENUM('male', 'female', 'rather_not_say');
ALTER TABLE "players" ALTER COLUMN "sex" TYPE "public"."player_sex" USING "sex"::text::"public"."player_sex";
DROP TYPE "public"."player_sex_old";
