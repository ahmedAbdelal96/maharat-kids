import { z } from "zod";

export const paymentMethodTypeSchema = z.enum(["CASH_ON_DELIVERY", "MANUAL_TRANSFER", "ONLINE_GATEWAY"]);

export const createPaymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["MANUAL_TRANSFER", "ONLINE_GATEWAY"]),
  enabled: z.boolean().default(false),
  destination: z.string().trim().max(160).nullable().optional(),
  instructions: z.string().trim().max(500).nullable().optional(),
  confirmationWhatsApp: z.string().trim().max(40).nullable().optional(),
  providerKey: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.extend({
  id: z.string().trim().min(1),
  type: paymentMethodTypeSchema,
});

export const paymentMethodIdSchema = z.object({ id: z.string().trim().min(1) });

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
