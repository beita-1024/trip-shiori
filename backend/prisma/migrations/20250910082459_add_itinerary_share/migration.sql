-- CreateEnum
CREATE TYPE "public"."SharePermission" AS ENUM ('READ_ONLY', 'EDIT');

-- CreateEnum
CREATE TYPE "public"."ShareScope" AS ENUM ('PUBLIC_LINK', 'RESTRICTED_EMAILS', 'AUTHENTICATED_USERS', 'PUBLIC');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItineraryShare" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "permission" "public"."SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" "public"."ShareScope" NOT NULL DEFAULT 'PUBLIC_LINK',
    "allowedEmails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "ItineraryShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "public"."PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "public"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_createdAt_idx" ON "public"."PasswordResetToken"("userId", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "ItineraryShare_expiresAt_idx" ON "public"."ItineraryShare"("expiresAt");

-- CreateIndex
CREATE INDEX "ItineraryShare_scope_idx" ON "public"."ItineraryShare"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryShare_itineraryId_key" ON "public"."ItineraryShare"("itineraryId");

-- CreateIndex
CREATE INDEX "Itinerary_userId_updatedAt_idx" ON "public"."Itinerary"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Itinerary_userId_createdAt_idx" ON "public"."Itinerary"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Itinerary_updatedAt_idx" ON "public"."Itinerary"("updatedAt");

-- CreateIndex
CREATE INDEX "Itinerary_createdAt_idx" ON "public"."Itinerary"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItineraryShare" ADD CONSTRAINT "ItineraryShare_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "public"."Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
