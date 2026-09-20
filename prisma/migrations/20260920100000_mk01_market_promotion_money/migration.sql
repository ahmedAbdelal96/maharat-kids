-- Market-specific monetary rules prevent a numeric amount from crossing currencies.
CREATE TABLE "PromotionMarketRule" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "minimumOrderSubtotal" DECIMAL(12,2),
    "fixedDiscountAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromotionMarketRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponMarketRule" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "fixedDiscountAmount" DECIMAL(12,2),
    "minimumOrderSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maximumDiscountAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CouponMarketRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionMarketRule_promotionId_market_key" ON "PromotionMarketRule"("promotionId", "market");
CREATE INDEX "PromotionMarketRule_market_idx" ON "PromotionMarketRule"("market");
CREATE UNIQUE INDEX "CouponMarketRule_couponId_market_key" ON "CouponMarketRule"("couponId", "market");
CREATE INDEX "CouponMarketRule_market_idx" ON "CouponMarketRule"("market");

ALTER TABLE "PromotionMarketRule" ADD CONSTRAINT "PromotionMarketRule_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponMarketRule" ADD CONSTRAINT "CouponMarketRule_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve historical configuration while requiring all future pricing reads to use a market rule.
INSERT INTO "PromotionMarketRule" ("id", "promotionId", "market", "minimumOrderSubtotal", "fixedDiscountAmount", "updatedAt")
SELECT concat('pmr_', md5(p."id" || 'SAUDI_ARABIA')), p."id", 'SAUDI_ARABIA'::"Market", p."minimumOrderSubtotal", p."fixedDiscountAmount", CURRENT_TIMESTAMP FROM "Promotion" p;
INSERT INTO "PromotionMarketRule" ("id", "promotionId", "market", "minimumOrderSubtotal", "fixedDiscountAmount", "updatedAt")
SELECT concat('pmr_', md5(p."id" || 'EGYPT')), p."id", 'EGYPT'::"Market", p."minimumOrderSubtotal", p."fixedDiscountAmount", CURRENT_TIMESTAMP FROM "Promotion" p;
INSERT INTO "CouponMarketRule" ("id", "couponId", "market", "fixedDiscountAmount", "minimumOrderSubtotal", "maximumDiscountAmount", "updatedAt")
SELECT concat('cmr_', md5(c."id" || 'SAUDI_ARABIA')), c."id", 'SAUDI_ARABIA'::"Market", c."fixedDiscountAmount", c."minimumOrderSubtotal", c."maximumDiscountAmount", CURRENT_TIMESTAMP FROM "Coupon" c;
INSERT INTO "CouponMarketRule" ("id", "couponId", "market", "fixedDiscountAmount", "minimumOrderSubtotal", "maximumDiscountAmount", "updatedAt")
SELECT concat('cmr_', md5(c."id" || 'EGYPT')), c."id", 'EGYPT'::"Market", c."fixedDiscountAmount", c."minimumOrderSubtotal", c."maximumDiscountAmount", CURRENT_TIMESTAMP FROM "Coupon" c;
