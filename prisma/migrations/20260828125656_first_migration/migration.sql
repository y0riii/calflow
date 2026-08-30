-- CreateEnum
CREATE TYPE "status" AS ENUM ('confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "platform" AS ENUM ('zoom', 'meet', 'physical');

-- CreateTable
CREATE TABLE "users" (
    "userId" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "events" (
    "eventId" SERIAL NOT NULL,
    "hostId" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "description" VARCHAR(1000),
    "durationMins" INTEGER NOT NULL DEFAULT 30,
    "platform" "platform" NOT NULL DEFAULT 'zoom',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "availabilityId" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("availabilityId")
);

-- CreateTable
CREATE TABLE "bookings" (
    "bookingId" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "hostId" INTEGER NOT NULL,
    "guestName" VARCHAR(100) NOT NULL,
    "guestEmail" VARCHAR(254) NOT NULL,
    "guestTimezone" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "status" "status" NOT NULL DEFAULT 'confirmed',
    "meetingUrl" TEXT,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "oauthaccounts" (
    "oauthAccountId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "oauthaccounts_pkey" PRIMARY KEY ("oauthAccountId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "events_hostId_slug_key" ON "events"("hostId", "slug");

-- CreateIndex
CREATE INDEX "availabilities_eventId_dayOfWeek_idx" ON "availabilities"("eventId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "bookings_hostId_startsAt_idx" ON "bookings"("hostId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauthaccounts_provider_providerAccountId_key" ON "oauthaccounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthaccounts_userId_provider_key" ON "oauthaccounts"("userId", "provider");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthaccounts" ADD CONSTRAINT "oauthaccounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
