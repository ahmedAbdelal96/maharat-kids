import { z } from "zod";
import { shipmentStatuses } from "./constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const shippingCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: optionalText(40),
  contactPerson: optionalText(120),
  notes: optionalText(500),
});

export const updateShippingCompanySchema = shippingCompanySchema.extend({ isActive: z.boolean() });
export const updateShippingCompanyInputSchema = updateShippingCompanySchema.extend({ id: z.string().trim().min(1) });

export const assignShipmentSchema = z.object({
  orderId: z.string().trim().min(1),
  shippingCompanyId: z.string().trim().min(1),
  trackingNumber: optionalText(120),
});

export const transitionShipmentSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(shipmentStatuses),
  failureReason: z.enum(["CUSTOMER_DID_NOT_ANSWER", "CUSTOMER_REFUSED", "WRONG_ADDRESS", "CUSTOMER_UNAVAILABLE", "OTHER"]).optional(),
  note: optionalText(500),
});

export const settlementBatchSchema = z.object({
  shippingCompanyId: z.string().trim().min(1),
  orderIds: z.array(z.string().trim().min(1)).min(1).max(100),
  receivedAmount: z.coerce.number().finite().nonnegative(),
  receivedAt: z.coerce.date(),
  reference: optionalText(120),
  note: optionalText(500),
});

export const bulkReturnSchema = z.object({
  shippingCompanyId: z.string().trim().min(1),
  orderIds: z.array(z.string().trim().min(1)).min(1).max(100),
});

export type ShippingCompanyInput = z.infer<typeof shippingCompanySchema>;
export type UpdateShippingCompanyInput = z.infer<typeof updateShippingCompanySchema>;
export type AssignShipmentInput = z.infer<typeof assignShipmentSchema>;
export type TransitionShipmentInput = z.infer<typeof transitionShipmentSchema>;
export type SettlementBatchInput = z.infer<typeof settlementBatchSchema>;
export type BulkReturnInput = z.infer<typeof bulkReturnSchema>;
