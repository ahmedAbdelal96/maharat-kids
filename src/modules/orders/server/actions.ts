"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { placeOrderSchema, updateOrderStatusSchema, updatePaymentStatusSchema } from "../schema";
import { OrderService } from "../domain/service";
import { PrismaOrderRepository } from "../infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";
import { getPrismaClient } from "@/database/prisma";
import { getPaymentGateway } from "@/modules/payments/providers/gateway";
import { z } from "zod";

function service() { return new OrderService(new PrismaOrderRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function placeOrder(input: unknown) { const parsed = placeOrderSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a delivery address and payment method.")); const actor = await requireCustomer(); if (!actor.success) return failure(actor.error); const settings = await getPublicStoreSettings(); if (!settings.success) return failure(settings.error); const result = await service().placeOrder(actor.data.user.id, parsed.data.addressId, parsed.data.paymentMethodId, settings.data.currency, parsed.data.checkoutToken, parsed.data.paymentReference, parsed.data.paymentNotes); if (result.success) { revalidatePath("/cart"); revalidatePath("/checkout"); revalidatePath("/account"); revalidatePath("/admin/orders"); revalidatePath("/admin/payments"); } return result; }

const onlinePaymentSchema = z.object({ orderId: z.string().min(1), locale: z.enum(["ar", "en"]), idempotencyKey: z.string().min(16).max(100) });
export async function startOnlinePayment(input: unknown) {
  const parsed = onlinePaymentSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please start payment from the current order."));
  const actor = await requireCustomer(); if (!actor.success) return failure(actor.error);
  const db = getPrismaClient();
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentAttempt" WHERE "idempotencyKey" = ${parsed.data.idempotencyKey} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: parsed.data.orderId, customerId: actor.data.user.id }, include: { customer: { select: { name: true, email: true, phone: true } }, paymentAttempts: { where: { idempotencyKey: parsed.data.idempotencyKey } } } });
      if (!order || !order.paymentProviderCode || order.paymentStatus === "PAID") throw new Error("PAYMENT_NOT_AVAILABLE");
      const attempt = order.paymentAttempts[0]; if (!attempt) throw new Error("PAYMENT_ATTEMPT_NOT_FOUND");
      if (attempt.checkoutUrl && attempt.providerReference) return { checkoutUrl: attempt.checkoutUrl, providerReference: attempt.providerReference };
      const gateway = getPaymentGateway(order.paymentProviderCode); if (!gateway) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const created = await gateway.createPayment({ orderNumber: order.orderNumber, amount: order.total.toFixed(2), currency: order.currency as "SAR" | "EGP", customer: { ...order.customer, name: order.customer.name ?? "Customer" }, responseUrl: `${appUrl}/${parsed.data.locale}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`, cancelUrl: `${appUrl}/${parsed.data.locale}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`, idempotencyKey: parsed.data.idempotencyKey });
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { providerReference: created.providerReference, checkoutUrl: created.checkoutUrl } });
      return created;
    });
    return { success: true as const, data: result };
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_INITIATION_FAILED";
    return failure(new ValidationError(code === "PAYMENT_PROVIDER_UNAVAILABLE" || code === "PAYZATY_NOT_CONFIGURED" ? "Online payment is temporarily unavailable." : "Payment could not be started."));
  }
}
export async function updateOrderStatus(input: unknown) { const parsed = updateOrderStatusSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid order status.")); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().updateStatus(actor.data.user.id, parsed.data.orderId, parsed.data.status); if (result.success) { const history = result.data.history.at(-1); await writeAdminAudit(actor.data, { action: parsed.data.status === "CANCELLED" ? AUDIT_ACTIONS.ORDER_CANCELLED : AUDIT_ACTIONS.ORDER_STATUS_CHANGED, entityType: AUDIT_ENTITY_TYPES.ORDER, entityId: result.data.id, entityLabel: result.data.orderNumber, changes: history ? { fields: [{ field: "status", before: history.oldStatus ?? "None", after: history.newStatus }] } : null }); revalidatePath("/admin/orders"); revalidatePath("/account"); } return result; }
export async function updatePaymentStatus(input: unknown) { const parsed = updatePaymentStatusSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid payment status.")); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().updatePaymentStatus(actor.data.user.id, parsed.data.orderId, parsed.data.status, parsed.data.note); if (result.success) { const history = result.data.paymentHistory.at(-1); await writeAdminAudit(actor.data, { action: parsed.data.status === "PAID" ? AUDIT_ACTIONS.PAYMENT_APPROVED : parsed.data.status === "FAILED" ? AUDIT_ACTIONS.PAYMENT_REJECTED : AUDIT_ACTIONS.ORDER_STATUS_CHANGED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: result.data.id, entityLabel: result.data.orderNumber, changes: history ? { fields: [{ field: "paymentStatus", before: history.oldStatus ?? "None", after: history.newStatus }] } : null }); revalidatePath("/admin/orders"); revalidatePath("/admin/payments"); revalidatePath("/admin"); revalidatePath("/account"); } return result; }
export async function getAdminOrderDetails(orderId: unknown) { if (typeof orderId !== "string" || !orderId.trim()) return failure(new ValidationError("Please select a valid order.")); const actor = await requireAuthenticatedUser(); return actor.success ? service().getAdminOrder(actor.data.user.id, orderId) : failure(actor.error); }
