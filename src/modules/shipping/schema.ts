import { z } from "zod";
import { shipmentStatuses } from "./constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const shippingCompanySchema = z.object({
  code: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  nameAr: optionalText(120),
  nameEn: optionalText(120),
  phone: optionalText(40),
  contactPerson: optionalText(120),
  notes: optionalText(500),
});

export const updateShippingCompanySchema = shippingCompanySchema.extend({ isActive: z.boolean() });
export const updateShippingCompanyInputSchema = updateShippingCompanySchema.extend({ id: z.string().trim().min(1) });

const marketConfigSchema = z.object({ enabled: z.boolean(), isCheckoutCarrier: z.boolean(), rate: z.coerce.number().finite().nonnegative().max(999999999) }).refine((value) => value.enabled || !value.isCheckoutCarrier, { message: "A disabled carrier cannot be the checkout carrier." });
export const updateShippingCarrierConfigurationSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  nameAr: optionalText(120),
  nameEn: optionalText(120),
  isActive: z.boolean(),
  markets: z.object({ SAUDI_ARABIA: marketConfigSchema, EGYPT: marketConfigSchema }),
});

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
export type UpdateShippingCarrierConfigurationInput = z.infer<typeof updateShippingCarrierConfigurationSchema>;
export type AssignShipmentInput = z.infer<typeof assignShipmentSchema>;
export type TransitionShipmentInput = z.infer<typeof transitionShipmentSchema>;
export type SettlementBatchInput = z.infer<typeof settlementBatchSchema>;
export type BulkReturnInput = z.infer<typeof bulkReturnSchema>;
