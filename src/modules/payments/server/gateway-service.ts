import "server-only";

import { getPrismaClient } from "@/database/prisma";
import { getPaymentGateway } from "../providers/gateway";

export async function reconcileOnlinePayment(orderNumber: string, customerId: string) {
  const db = getPrismaClient();
  const order = await db.order.findFirst({ where: { orderNumber, customerId }, include: { paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const attempt = order?.paymentAttempts[0];
  if (!order || !attempt || !order.paymentProviderCode || !attempt.providerReference) return order;
  const gateway = getPaymentGateway(order.paymentProviderCode); if (!gateway) return order;
  const result = await gateway.getPaymentStatus(attempt.providerReference);
  if ((result.amount && result.amount !== order.total.toFixed(2)) || (result.currency && result.currency !== order.currency)) throw new Error("PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH");
  if (result.status === "PENDING") return order;
  return db.$transaction(async (tx) => {
    const current = await tx.paymentAttempt.findUnique({ where: { id: attempt.id }, select: { status: true } });
    if (!current || current.status === result.status) return tx.order.findUnique({ where: { id: order.id } });
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: result.status } });
    const next = result.status === "PAID" ? "PAID" : "FAILED";
    if (order.paymentStatus !== next) { await tx.order.update({ where: { id: order.id }, data: { paymentStatus: next, paidAt: next === "PAID" ? new Date() : null } }); await tx.paymentStatusHistory.create({ data: { orderId: order.id, oldStatus: order.paymentStatus, newStatus: next, changedByUserId: customerId, note: `Verified ${order.paymentProviderCode} payment status.` } }); }
    return tx.order.findUnique({ where: { id: order.id } });
  });
}
