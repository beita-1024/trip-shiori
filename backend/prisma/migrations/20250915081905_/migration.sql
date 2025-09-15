/*
  Warnings:

  - The values [RESTRICTED_EMAILS,AUTHENTICATED_USERS] on the enum `ShareScope` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ItineraryShareEmail` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ShareScope_new" AS ENUM ('PRIVATE', 'PUBLIC_LINK', 'PUBLIC');
ALTER TABLE "public"."ItineraryShare" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE "public"."ItineraryShare" ALTER COLUMN "scope" TYPE "public"."ShareScope_new" USING ("scope"::text::"public"."ShareScope_new");
ALTER TYPE "public"."ShareScope" RENAME TO "ShareScope_old";
ALTER TYPE "public"."ShareScope_new" RENAME TO "ShareScope";
DROP TYPE "public"."ShareScope_old";
ALTER TABLE "public"."ItineraryShare" ALTER COLUMN "scope" SET DEFAULT 'PRIVATE';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ItineraryShareEmail" DROP CONSTRAINT "ItineraryShareEmail_shareId_fkey";

-- DropTable
DROP TABLE "public"."ItineraryShareEmail";
