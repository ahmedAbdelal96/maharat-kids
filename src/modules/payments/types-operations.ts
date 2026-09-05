import type { PaymentStatus } from "@prisma/client";

export type PaymentOperationOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  total: string;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethodName: string;
  paymentReference: string | null;
  paymentNotes: string | null;
  createdAt: string;
};

export type PendingSettlement = PaymentOperationOrder & {
  settlementId: string;
  settlementAmount: string;
  settlementStatus: "PENDING_SETTLEMENT" | "SETTLED";
  settledAt: string | null;
};
