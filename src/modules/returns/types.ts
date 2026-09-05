import type { RefundMethod, RefundStatus, ReturnReason, ReturnStatus } from "@prisma/client";

export type ReturnItemView = {
  id: string;
  orderItemId: string;
  productName: string;
  imageUrl: string | null;
  orderQuantity: number;
  requestedQuantity: number;
  approvedQuantity: number | null;
  receivedQuantity: number;
  restockQuantity: number;
  calculatedRefundAmount: string;
  unitPrice: string;
  isPromotionGift: boolean;
};

export type ReturnTimelineEntry = {
  id: string;
  oldStatus: ReturnStatus | null;
  newStatus: ReturnStatus;
  customerVisibleNote: string | null;
  createdAt: string;
};

export type RefundView = {
  id: string;
  status: RefundStatus;
  method: RefundMethod | null;
  amount: string;
  reference: string | null;
  processedAt: string | null;
};

export type ReturnSummary = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  status: ReturnStatus;
  reason: ReturnReason;
  requestedAt: string;
  itemCount: number;
  requestedQuantity: number;
  estimatedRefundAmount: string;
  refundStatus: RefundStatus | null;
};

export type ReturnDetails = ReturnSummary & {
  customerNote: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  returningAt: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  currency: string;
  paymentStatus: string;
  paymentMethodName: string;
  orderStatus: string;
  items: ReturnItemView[];
  timeline: ReturnTimelineEntry[];
  refund: RefundView | null;
};

export type ReturnPolicy = {
  enabled: boolean;
  windowDays: number;
  policyText: string;
};

export type EligibleReturnItem = ReturnItemView & { returnableQuantity: number };

export type CustomerReturnPage = {
  returns: ReturnSummary[];
  policy: ReturnPolicy;
};

export type AdminReturnPage = {
  returns: ReturnSummary[];
  page: number;
  pageSize: number;
  total: number;
  kpis: { requested: number; awaitingReturn: number; returning: number; awaitingRefund: number; pendingRefundAmount: string };
};
