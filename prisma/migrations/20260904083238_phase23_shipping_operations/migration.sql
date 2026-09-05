-- CreateEnum
CREATE TYPE "public"."ShipmentStatus" AS ENUM ('NOT_ASSIGNED', 'READY_FOR_SHIPPING', 'WITH_CARRIER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNING', 'RETURNED_TO_STORE');

-- CreateEnum
CREATE TYPE "public"."DeliveryFailureReason" AS ENUM ('CUSTOMER_DID_NOT_ANSWER', 'CUSTOMER_REFUSED', 'WRONG_ADDRESS', 'CUSTOMER_UNAVAILABLE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_DELIVERY_FAILED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_RETURNED_TO_STORE';

-- CreateTable
CREATE TABLE "public"."ShippingCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shippingCompanyId" TEXT,
    "trackingNumber" TEXT,
    "status" "public"."ShipmentStatus" NOT NULL DEFAULT 'NOT_ASSIGNED',
    "handedToCarrierAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" "public"."DeliveryFailureReason",
    "failureNote" TEXT,
    "returnStartedAt" TIMESTAMP(3),
    "returnedToStoreAt" TIMESTAMP(3),
    "inventoryRestoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShipmentStatusHistory" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "oldStatus" "public"."ShipmentStatus",
    "newStatus" "public"."ShipmentStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarrierSettlementBatch" (
    "id" TEXT NOT NULL,
    "shippingCompanyId" TEXT NOT NULL,
    "reference" TEXT,
    "expectedAmount" DECIMAL(12,2) NOT NULL,
    "receivedAmount" DECIMAL(12,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarrierSettlementBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarrierSettlementItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CarrierSettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingCompany_isActive_name_idx" ON "public"."ShippingCompany"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipment_orderId_key" ON "public"."OrderShipment"("orderId");

-- CreateIndex
CREATE INDEX "OrderShipment_shippingCompanyId_status_updatedAt_idx" ON "public"."OrderShipment"("shippingCompanyId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "OrderShipment_status_updatedAt_idx" ON "public"."OrderShipment"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "OrderShipment_trackingNumber_idx" ON "public"."OrderShipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "ShipmentStatusHistory_shipmentId_createdAt_idx" ON "public"."ShipmentStatusHistory"("shipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentStatusHistory_changedByUserId_idx" ON "public"."ShipmentStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "CarrierSettlementBatch_shippingCompanyId_receivedAt_idx" ON "public"."CarrierSettlementBatch"("shippingCompanyId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierSettlementItem_orderId_key" ON "public"."CarrierSettlementItem"("orderId");

-- CreateIndex
CREATE INDEX "CarrierSettlementItem_batchId_idx" ON "public"."CarrierSettlementItem"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierSettlementItem_batchId_orderId_key" ON "public"."CarrierSettlementItem"("batchId", "orderId");

-- AddForeignKey
ALTER TABLE "public"."OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderShipment" ADD CONSTRAINT "OrderShipment_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "public"."ShippingCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "public"."OrderShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarrierSettlementBatch" ADD CONSTRAINT "CarrierSettlementBatch_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "public"."ShippingCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarrierSettlementBatch" ADD CONSTRAINT "CarrierSettlementBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarrierSettlementItem" ADD CONSTRAINT "CarrierSettlementItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."CarrierSettlementBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarrierSettlementItem" ADD CONSTRAINT "CarrierSettlementItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
