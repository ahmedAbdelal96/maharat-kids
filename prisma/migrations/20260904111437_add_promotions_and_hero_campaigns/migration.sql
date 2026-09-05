-- CreateEnum
CREATE TYPE "public"."PromotionType" AS ENUM ('ORDER_PERCENTAGE_DISCOUNT', 'ORDER_FIXED_DISCOUNT', 'BUY_X_GET_Y_FREE');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "promotionDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "isPromotionGift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionId" TEXT;

-- CreateTable
CREATE TABLE "public"."Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."PromotionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInHero" BOOLEAN NOT NULL DEFAULT false,
    "showOnOffersPage" BOOLEAN NOT NULL DEFAULT true,
    "bannerMediaId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "minimumOrderSubtotal" DECIMAL(12,2),
    "percentageDiscount" DECIMAL(5,2),
    "fixedDiscountAmount" DECIMAL(12,2),
    "qualifyingProductId" TEXT,
    "buyQuantity" INTEGER,
    "giftProductId" TEXT,
    "giftQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderPromotion" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "promotionId" TEXT,
    "promotionName" TEXT NOT NULL,
    "promotionType" "public"."PromotionType" NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "ruleSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_slug_key" ON "public"."Promotion"("slug");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_priority_idx" ON "public"."Promotion"("isActive", "startsAt", "endsAt", "priority");

-- CreateIndex
CREATE INDEX "Promotion_showInHero_isActive_idx" ON "public"."Promotion"("showInHero", "isActive");

-- CreateIndex
CREATE INDEX "Promotion_showOnOffersPage_isActive_idx" ON "public"."Promotion"("showOnOffersPage", "isActive");

-- CreateIndex
CREATE INDEX "Promotion_qualifyingProductId_idx" ON "public"."Promotion"("qualifyingProductId");

-- CreateIndex
CREATE INDEX "Promotion_giftProductId_idx" ON "public"."Promotion"("giftProductId");

-- CreateIndex
CREATE INDEX "Promotion_bannerMediaId_idx" ON "public"."Promotion"("bannerMediaId");

-- CreateIndex
CREATE INDEX "OrderPromotion_orderId_idx" ON "public"."OrderPromotion"("orderId");

-- CreateIndex
CREATE INDEX "OrderPromotion_promotionId_idx" ON "public"."OrderPromotion"("promotionId");

-- CreateIndex
CREATE INDEX "OrderItem_promotionId_idx" ON "public"."OrderItem"("promotionId");

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_bannerMediaId_fkey" FOREIGN KEY ("bannerMediaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_qualifyingProductId_fkey" FOREIGN KEY ("qualifyingProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPromotion" ADD CONSTRAINT "OrderPromotion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPromotion" ADD CONSTRAINT "OrderPromotion_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "public"."Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
