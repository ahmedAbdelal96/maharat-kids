-- CreateEnum
CREATE TYPE "public"."SettlementStatus" AS ENUM ('PENDING_SETTLEMENT', 'SETTLED');

-- AlterEnum
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "paymentReference" TEXT;

-- CreateTable
CREATE TABLE "public"."PaymentStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldStatus" "public"."PaymentStatus",
    "newStatus" "public"."PaymentStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentSettlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "public"."SettlementStatus" NOT NULL DEFAULT 'PENDING_SETTLEMENT',
    "settledByUserId" TEXT,
    "settledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentStatusHistory_orderId_createdAt_idx" ON "public"."PaymentStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentStatusHistory_changedByUserId_idx" ON "public"."PaymentStatusHistory"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlement_orderId_key" ON "public"."PaymentSettlement"("orderId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_status_createdAt_idx" ON "public"."PaymentSettlement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentSettlement_settledByUserId_idx" ON "public"."PaymentSettlement"("settledByUserId");

-- AddForeignKey
ALTER TABLE "public"."PaymentStatusHistory" ADD CONSTRAINT "PaymentStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentStatusHistory" ADD CONSTRAINT "PaymentStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
