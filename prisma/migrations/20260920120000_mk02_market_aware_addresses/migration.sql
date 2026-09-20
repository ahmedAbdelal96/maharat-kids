CREATE TYPE "AddressSource" AS ENUM ('MANUAL', 'SPL');
CREATE TYPE "AddressVerification" AS ENUM ('UNVERIFIED', 'VERIFIED');
CREATE TYPE "AddressResolutionStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

ALTER TABLE "CustomerAddress"
  ADD COLUMN "market" "Market" NOT NULL DEFAULT 'EGYPT',
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'EG',
  ADD COLUMN "region" TEXT,
  ADD COLUMN "district" TEXT,
  ADD COLUMN "buildingNumber" TEXT,
  ADD COLUMN "additionalNumber" TEXT,
  ADD COLUMN "shortAddress" TEXT,
  ADD COLUMN "unitNumber" TEXT,
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "source" "AddressSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "verification" "AddressVerification" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerReference" TEXT,
  ADD COLUMN "consentAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

CREATE INDEX "CustomerAddress_userId_market_isDefault_idx" ON "CustomerAddress"("userId", "market", "isDefault");
CREATE INDEX "CustomerAddress_market_verification_idx" ON "CustomerAddress"("market", "verification");
CREATE INDEX "CustomerAddress_providerReference_idx" ON "CustomerAddress"("providerReference");
CREATE UNIQUE INDEX "CustomerAddress_one_default_per_market_idx"
  ON "CustomerAddress"("userId", "market")
  WHERE "isDefault" = true;

CREATE TABLE "AddressResolutionSession" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "market" "Market" NOT NULL,
  "provider" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "providerSessionReference" TEXT,
  "challengeHash" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "status" "AddressResolutionStatus" NOT NULL DEFAULT 'PENDING',
  "consentAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AddressResolutionSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AddressResolutionSession_customerId_market_status_createdAt_idx"
  ON "AddressResolutionSession"("customerId", "market", "status", "createdAt");
CREATE INDEX "AddressResolutionSession_providerSessionReference_idx"
  ON "AddressResolutionSession"("providerSessionReference");
CREATE INDEX "AddressResolutionSession_expiresAt_idx"
  ON "AddressResolutionSession"("expiresAt");

ALTER TABLE "AddressResolutionSession"
  ADD CONSTRAINT "AddressResolutionSession_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
