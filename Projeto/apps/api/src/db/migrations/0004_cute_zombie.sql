ALTER TABLE "users" ALTER COLUMN "banned" SET DATA TYPE boolean USING (banned = 'true');
ALTER TABLE "users" ALTER COLUMN "banned" SET DEFAULT false;
