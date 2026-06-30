-- CreateEnum
CREATE TYPE "EtsyWhoMade" AS ENUM ('I_DID', 'SOMEONE_ELSE', 'COLLECTIVE');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "isSupply" BOOLEAN,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "returnPolicyId" TEXT,
ADD COLUMN     "shippingProfileId" TEXT,
ADD COLUMN     "taxonomyId" TEXT,
ADD COLUMN     "whenMade" TEXT,
ADD COLUMN     "whoMade" "EtsyWhoMade";

-- CreateTable
CREATE TABLE "listing_images" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "etsyImageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_images_organizationId_idx" ON "listing_images"("organizationId");

-- CreateIndex
CREATE INDEX "listing_images_listingId_idx" ON "listing_images"("listingId");

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
