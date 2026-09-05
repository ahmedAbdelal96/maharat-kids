-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "inventoryTrackedAtPurchase" BOOLEAN NOT NULL DEFAULT false;
