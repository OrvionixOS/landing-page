-- AlterEnum
ALTER TYPE "GenerationType" ADD VALUE 'IMAGE_BLUEPRINT';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "imageBlueprintData" JSONB;
