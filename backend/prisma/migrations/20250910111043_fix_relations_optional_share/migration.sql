-- DropForeignKey
ALTER TABLE "public"."Itinerary" DROP CONSTRAINT "Itinerary_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItineraryShareEmail" DROP CONSTRAINT "ItineraryShareEmail_shareId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ItineraryShare" ADD CONSTRAINT "ItineraryShare_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "public"."Itinerary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItineraryShareEmail" ADD CONSTRAINT "ItineraryShareEmail_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "public"."ItineraryShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
