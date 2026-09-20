-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethodType" ADD VALUE 'ONLINE_PAYMENT';
ALTER TYPE "PaymentMethodType" ADD VALUE 'BANK_TRANSFER';

-- DropIndex
DROP INDEX "CustomerAddress_userId_isDefault_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProviderCode" TEXT,
ADD COLUMN     "paymentSnapshot" JSONB;

-- CreateTable
CREATE TABLE "PaymentMethodMarketConfig" (
    "id" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodMarketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransferAccount" (
    "id" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "bankNameAr" TEXT NOT NULL,
    "bankNameEn" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "accountNumber" TEXT,
    "swiftCode" TEXT,
    "instructionsAr" TEXT,
    "instructionsEn" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransferAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "checkoutUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransferSubmission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "transferReference" TEXT,
    "transferredAmount" DECIMAL(12,2),
    "transferDate" TIMESTAMP(3),
    "receiptKey" TEXT,
    "receiptMimeType" TEXT,
    "receiptSize" INTEGER,
    "customerNote" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "BankTransferSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMethodMarketConfig_market_enabled_sortOrder_idx" ON "PaymentMethodMarketConfig"("market", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodMarketConfig_market_paymentMethodId_key" ON "PaymentMethodMarketConfig"("market", "paymentMethodId");

-- CreateIndex
CREATE INDEX "BankTransferAccount_market_enabled_isDefault_idx" ON "BankTransferAccount"("market", "enabled", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key" ON "PaymentAttempt"("providerReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_providerReference_idx" ON "PaymentAttempt"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransferSubmission_orderId_key" ON "BankTransferSubmission"("orderId");

-- CreateIndex
CREATE INDEX "BankTransferSubmission_status_submittedAt_idx" ON "BankTransferSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "BankTransferSubmission_reviewedByUserId_idx" ON "BankTransferSubmission"("reviewedByUserId");

-- AddForeignKey
ALTER TABLE "PaymentMethodMarketConfig" ADD CONSTRAINT "PaymentMethodMarketConfig_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferSubmission" ADD CONSTRAINT "BankTransferSubmission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferSubmission" ADD CONSTRAINT "BankTransferSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ShippingCarrierMarketConfig_market_enabled_isCheckoutCarrier_id" RENAME TO "ShippingCarrierMarketConfig_market_enabled_isCheckoutCarrie_idx";
