-- MK-03: preserve existing operational carriers while adding stable identity/localized display fields.
ALTER TABLE "ShippingCompany" ADD COLUMN "code" TEXT;
UPDATE "ShippingCompany" SET "code" = 'legacy-' || "id" WHERE "code" IS NULL;
ALTER TABLE "ShippingCompany" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "ShippingCompany" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "ShippingCompany" ADD COLUMN "nameEn" TEXT;
CREATE UNIQUE INDEX "ShippingCompany_code_key" ON "ShippingCompany"("code");

CREATE TYPE "ShippingRateSource" AS ENUM ('ADMIN_CONFIGURED', 'CARRIER_API');

ALTER TABLE "Order" ADD COLUMN "shippingCarrierId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCarrierCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCarrierNameAr" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCarrierNameEn" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingRateSource" "ShippingRateSource";

CREATE TABLE "ShippingCarrierMarketConfig" (
    "id" TEXT NOT NULL,
    "shippingCompanyId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isCheckoutCarrier" BOOLEAN NOT NULL DEFAULT false,
    "rate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingCarrierMarketConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingCarrierMarketConfig_shippingCompanyId_market_key" ON "ShippingCarrierMarketConfig"("shippingCompanyId", "market");
CREATE INDEX "ShippingCarrierMarketConfig_market_enabled_isCheckoutCarrier_idx" ON "ShippingCarrierMarketConfig"("market", "enabled", "isCheckoutCarrier");
CREATE UNIQUE INDEX "ShippingCarrierMarketConfig_market_checkout_key" ON "ShippingCarrierMarketConfig"("market") WHERE "enabled" = true AND "isCheckoutCarrier" = true;
ALTER TABLE "ShippingCarrierMarketConfig" ADD CONSTRAINT "ShippingCarrierMarketConfig_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "ShippingCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
