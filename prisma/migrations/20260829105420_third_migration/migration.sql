/*
  Warnings:

  - You are about to drop the column `eventId` on the `availabilities` table. All the data in the column will be lost.
  - Added the required column `userId` to the `availabilities` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "availabilities" DROP CONSTRAINT "availabilities_eventId_fkey";

-- DropIndex
DROP INDEX "availabilities_eventId_dayOfWeek_idx";

-- AlterTable
ALTER TABLE "availabilities" DROP COLUMN "eventId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "location" VARCHAR(100),
ADD COLUMN     "minNoticeMins" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN     "rollingWindowDays" INTEGER NOT NULL DEFAULT 60;

-- CreateIndex
CREATE INDEX "availabilities_userId_dayOfWeek_idx" ON "availabilities"("userId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
