import { z } from "zod";
export const placeOrderSchema = z.object({ addressId: z.string().trim().min(1), paymentMethodId: z.string().trim().min(1), checkoutToken: z.string().trim().min(16).max(100), paymentReference: z.string().trim().max(120).optional(), paymentNotes: z.string().trim().max(500).optional() });
export const orderIdSchema = z.object({ orderId: z.string().trim().min(1) });
export const updateOrderStatusSchema = orderIdSchema.extend({ status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"]) });
export const updatePaymentStatusSchema = orderIdSchema.extend({ status: z.enum(["UNPAID", "PENDING", "PENDING_VERIFICATION", "PAID", "FAILED", "REFUNDED"]), note: z.string().trim().max(500).optional() });
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
