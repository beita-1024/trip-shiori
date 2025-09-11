-- DropForeignKey
ALTER TABLE "public"."ItineraryShare" DROP CONSTRAINT "ItineraryShare_itineraryId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ItineraryShare" ADD CONSTRAINT "ItineraryShare_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "public"."Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
