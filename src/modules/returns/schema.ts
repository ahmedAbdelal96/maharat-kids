import { z } from "zod";

const returnItemInput = z.object({ orderItemId: z.string().trim().min(1), quantity: z.coerce.number().int().min(1).max(99) });

export const requestReturnSchema = z.object({
  orderNumber: z.string().trim().min(1),
  items: z.array(returnItemInput).min(1).max(50),
  reason: z.enum(["DAMAGED", "DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "NO_LONGER_NEEDED", "OTHER"]),
  customerNote: z.string().trim().max(1000).optional(),
}).superRefine((input, ctx) => {
  if (input.reason === "OTHER" && !input.customerNote) ctx.addIssue({ code: "custom", path: ["customerNote"], message: "Please explain the reason for this return." });
});

export const returnIdSchema = z.object({ id: z.string().trim().min(1) });

export const approveReturnSchema = z.object({
  id: z.string().trim().min(1),
  items: z.array(z.object({ returnItemId: z.string().trim().min(1), approvedQuantity: z.coerce.number().int().min(0).max(99) })).min(1),
  customerNote: z.string().trim().max(1000).optional(),
});

export const rejectReturnSchema = z.object({ id: z.string().trim().min(1), customerVisibleNote: z.string().trim().min(1).max(1000) });

export const receiveReturnSchema = z.object({
  id: z.string().trim().min(1),
  items: z.array(z.object({ returnItemId: z.string().trim().min(1), receivedQuantity: z.coerce.number().int().min(0).max(99), restockQuantity: z.coerce.number().int().min(0).max(99) })).min(1),
});

export const completeRefundSchema = z.object({
  id: z.string().trim().min(1),
  method: z.enum(["BANK_TRANSFER", "WALLET", "ORIGINAL_PAYMENT_METHOD", "CASH", "OTHER"]),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const adminReturnQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(["ALL", "REQUESTED", "APPROVED", "RETURNING", "RECEIVED", "COMPLETED", "REJECTED", "CANCELLED"]).default("ALL"),
  search: z.string().trim().max(100).optional(),
  refundPending: z.coerce.boolean().default(false),
});
