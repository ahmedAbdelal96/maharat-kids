-- CreateEnum
CREATE TYPE "ProductFulfillmentType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- CreateEnum
CREATE TYPE "DigitalAssetStatus" AS ENUM ('ACTIVE', 'RETIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DigitalEntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "digitalAssetIdsSnapshot" JSONB,
ADD COLUMN     "fulfillmentTypeSnapshot" "ProductFulfillmentType" NOT NULL DEFAULT 'PHYSICAL';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fulfillmentType" "ProductFulfillmentType" NOT NULL DEFAULT 'PHYSICAL';

-- CreateTable
CREATE TABLE "DigitalAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "displayNameAr" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DigitalAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "digitalAssetId" TEXT NOT NULL,
    "status" "DigitalEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalDownloadEvent" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "digitalAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "DigitalDownloadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAsset_storageKey_key" ON "DigitalAsset"("storageKey");

-- CreateIndex
CREATE INDEX "DigitalAsset_productId_status_idx" ON "DigitalAsset"("productId", "status");

-- CreateIndex
CREATE INDEX "DigitalAsset_variantId_status_idx" ON "DigitalAsset"("variantId", "status");

-- CreateIndex
CREATE INDEX "DigitalAsset_checksum_idx" ON "DigitalAsset"("checksum");

-- CreateIndex
CREATE INDEX "DigitalEntitlement_userId_status_createdAt_idx" ON "DigitalEntitlement"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DigitalEntitlement_orderId_orderItemId_idx" ON "DigitalEntitlement"("orderId", "orderItemId");

-- CreateIndex
CREATE INDEX "DigitalEntitlement_digitalAssetId_status_idx" ON "DigitalEntitlement"("digitalAssetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalEntitlement_orderItemId_digitalAssetId_key" ON "DigitalEntitlement"("orderItemId", "digitalAssetId");

-- CreateIndex
CREATE INDEX "DigitalDownloadEvent_entitlementId_createdAt_idx" ON "DigitalDownloadEvent"("entitlementId", "createdAt");

-- CreateIndex
CREATE INDEX "DigitalDownloadEvent_userId_createdAt_idx" ON "DigitalDownloadEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DigitalDownloadEvent_digitalAssetId_createdAt_idx" ON "DigitalDownloadEvent"("digitalAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_fulfillmentType_status_idx" ON "Product"("fulfillmentType", "status");

-- AddForeignKey
ALTER TABLE "DigitalAsset" ADD CONSTRAINT "DigitalAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAsset" ADD CONSTRAINT "DigitalAsset_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDownloadEvent" ADD CONSTRAINT "DigitalDownloadEvent_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "DigitalEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDownloadEvent" ADD CONSTRAINT "DigitalDownloadEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDownloadEvent" ADD CONSTRAINT "DigitalDownloadEvent_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
