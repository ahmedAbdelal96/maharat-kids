import type { ReturnReason, ReturnStatus } from "@prisma/client";

export const returnReasons: readonly { value: ReturnReason; label: string }[] = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "DEFECTIVE", label: "Defective" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "NO_LONGER_NEEDED", label: "No longer needed" },
  { value: "OTHER", label: "Other" },
];

export const returnStatusLabels: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  RETURNING: "Returning",
  RECEIVED: "Received",
  COMPLETED: "Completed",
};

export const refundMethodLabels = {
  BANK_TRANSFER: "Bank transfer",
  WALLET: "Wallet",
  ORIGINAL_PAYMENT_METHOD: "Original payment method",
  CASH: "Cash",
  OTHER: "Other",
} as const;
