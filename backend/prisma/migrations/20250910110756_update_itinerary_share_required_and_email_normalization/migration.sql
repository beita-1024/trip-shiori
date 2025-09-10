/*
  Warnings:

  - You are about to drop the column `allowedEmails` on the `ItineraryShare` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ItineraryShare" DROP CONSTRAINT "ItineraryShare_itineraryId_fkey";

-- AlterTable
ALTER TABLE "public"."ItineraryShare" DROP COLUMN "allowedEmails";

-- CreateTable
CREATE TABLE "public"."ItineraryShareEmail" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryShareEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryShareEmail_email_idx" ON "public"."ItineraryShareEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryShareEmail_shareId_email_key" ON "public"."ItineraryShareEmail"("shareId", "email");

-- AddForeignKey
ALTER TABLE "public"."Itinerary" ADD CONSTRAINT "Itinerary_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."ItineraryShare"("itineraryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItineraryShareEmail" ADD CONSTRAINT "ItineraryShareEmail_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "public"."ItineraryShare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
