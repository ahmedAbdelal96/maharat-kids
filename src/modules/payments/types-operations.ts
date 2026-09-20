import type { PaymentStatus } from "@prisma/client";

export type PaymentOperationOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  total: string;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethodName: string;
  paymentReference: string | null;
  paymentNotes: string | null;
  paymentProviderCode?: string | null;
  market?: string | null;
  receiptKey?: string | null;
  senderName?: string | null;
  transferReference?: string | null;
  transferredAmount?: string | null;
  submittedAt?: string | null;
  createdAt: string;
};

export type PendingSettlement = PaymentOperationOrder & {
  settlementId: string;
  settlementAmount: string;
  settlementStatus: "PENDING_SETTLEMENT" | "SETTLED";
  settledAt: string | null;
};
