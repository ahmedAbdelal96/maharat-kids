-- CreateEnum
CREATE TYPE "Market" AS ENUM ('SAUDI_ARABIA', 'EGYPT');

-- CreateEnum
CREATE TYPE "CustomerIdentityChannel" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('CUSTOMER_AUTH');

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "market" "Market";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "market" "Market";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomerIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "CustomerIdentityChannel" NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "channel" "CustomerIdentityChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'CUSTOMER_AUTH',
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "requestSourceHash" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMarketPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMarketPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerIdentity_userId_idx" ON "CustomerIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIdentity_channel_normalizedValue_key" ON "CustomerIdentity"("channel", "normalizedValue");

-- CreateIndex
CREATE INDEX "OtpChallenge_channel_destination_purpose_createdAt_idx" ON "OtpChallenge"("channel", "destination", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_requestSourceHash_createdAt_idx" ON "OtpChallenge"("requestSourceHash", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "ProductMarketPrice_market_price_idx" ON "ProductMarketPrice"("market", "price");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMarketPrice_productId_market_key" ON "ProductMarketPrice"("productId", "market");

-- AddForeignKey
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "CustomerIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMarketPrice" ADD CONSTRAINT "ProductMarketPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
