/*
  Warnings:

  - The values [meet] on the enum `platform` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "platform_new" AS ENUM ('zoom', 'physical');
ALTER TABLE "public"."events" ALTER COLUMN "platform" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "platform" TYPE "platform_new" USING ("platform"::text::"platform_new");
ALTER TYPE "platform" RENAME TO "platform_old";
ALTER TYPE "platform_new" RENAME TO "platform";
DROP TYPE "public"."platform_old";
ALTER TABLE "events" ALTER COLUMN "platform" SET DEFAULT 'zoom';
COMMIT;
