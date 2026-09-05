-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."CouponRedemptionStatus" AS ENUM ('REDEEMED', 'REVERSED');

-- AlterTable
ALTER TABLE "public"."Cart" ADD COLUMN     "couponId" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "couponDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."CouponType" NOT NULL,
    "percentageDiscount" DECIMAL(5,2),
    "fixedDiscountAmount" DECIMAL(12,2),
    "minimumOrderSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maximumDiscountAmount" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "totalUsageLimit" INTEGER,
    "perCustomerUsageLimit" INTEGER,
    "canCombineWithPromotions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "status" "public"."CouponRedemptionStatus" NOT NULL DEFAULT 'REDEEMED',
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderCoupon" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "couponId" TEXT,
    "couponCode" TEXT NOT NULL,
    "couponName" TEXT NOT NULL,
    "couponType" "public"."CouponType" NOT NULL,
    "configuredValue" DECIMAL(12,2) NOT NULL,
    "actualDiscountAmount" DECIMAL(12,2) NOT NULL,
    "minimumSubtotalSnapshot" DECIMAL(12,2) NOT NULL,
    "combinationSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_startsAt_endsAt_idx" ON "public"."Coupon"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Coupon_type_idx" ON "public"."Coupon"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "public"."CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_status_redeemedAt_idx" ON "public"."CouponRedemption"("couponId", "status", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_customerId_couponId_status_idx" ON "public"."CouponRedemption"("customerId", "couponId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCoupon_orderId_key" ON "public"."OrderCoupon"("orderId");

-- CreateIndex
CREATE INDEX "OrderCoupon_couponId_idx" ON "public"."OrderCoupon"("couponId");

-- CreateIndex
CREATE INDEX "OrderCoupon_couponCode_idx" ON "public"."OrderCoupon"("couponCode");

-- CreateIndex
CREATE INDEX "Cart_couponId_idx" ON "public"."Cart"("couponId");

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderCoupon" ADD CONSTRAINT "OrderCoupon_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderCoupon" ADD CONSTRAINT "OrderCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
