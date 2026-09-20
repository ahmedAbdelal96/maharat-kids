import "server-only";

import { Prisma, PrismaClient, type RefundMethod, type ReturnReason, type ReturnStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { AdminReturnPage, CustomerReturnPage, EligibleReturnItem, RefundView, ReturnDetails, ReturnItemView, ReturnPolicy, ReturnSummary, ReturnTimelineEntry } from "../types";
import { hasRequiredPromotionGiftReturn, isReturnEligibleOrder } from "../domain/rules";
import { RefundCalculator } from "../domain/refund-calculator";
import { AuditLogService } from "@/modules/audit/domain/service";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import type { AuditMutationContext, AuditRecordInput } from "@/modules/audit/types";

const returnInclude = {
  order: {
    include: {
      shipment: { select: { deliveredAt: true } },
      statusHistory: { select: { newStatus: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
      promotions: { select: { promotionType: true, ruleSnapshot: true } },
    },
  },
  customer: { select: { name: true, email: true, phone: true } },
  items: { include: { orderItem: true }, orderBy: { createdAt: "asc" as const } },
  history: { orderBy: { createdAt: "asc" as const } },
  refund: true,
} as const;

type Database = PrismaClient | Prisma.TransactionClient;
type ReturnRecord = Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>;

function money(value: Prisma.Decimal): string { return value.toFixed(2); }

function policyValue(records: { key: string; value: Prisma.JsonValue }[], key: string, fallback: boolean | number | string) {
  const value = records.find((record) => record.key === key)?.value;
  return typeof value === typeof fallback ? value : fallback;
}

async function getPolicy(db: Database): Promise<ReturnPolicy> {
  const records = await db.storeSetting.findMany({ where: { key: { in: ["returns.enabled", "returns.windowDays", "returns.policyText"] } }, select: { key: true, value: true } });
  return {
    enabled: policyValue(records, "returns.enabled", false) as boolean,
    windowDays: policyValue(records, "returns.windowDays", 14) as number,
    policyText: policyValue(records, "returns.policyText", "") as string,
  };
}

function deliveryDate(record: { shipment: { deliveredAt: Date | null } | null; statusHistory: { newStatus: string; createdAt: Date }[] }): Date | null {
  return record.shipment?.deliveredAt ?? [...record.statusHistory].reverse().find((entry) => entry.newStatus === "DELIVERED")?.createdAt ?? null;
}

function inReturnWindow(deliveredAt: Date | null, windowDays: number, now = new Date()): boolean {
  if (!deliveredAt) return false;
  return now.getTime() <= deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000;
}

function toItem(record: ReturnRecord["items"][number]): ReturnItemView {
  return {
    id: record.id,
    orderItemId: record.orderItemId,
    productName: record.orderItem.name,
    imageUrl: record.orderItem.imageUrl,
    orderQuantity: record.orderItem.quantity,
    requestedQuantity: record.requestedQuantity,
    approvedQuantity: record.approvedQuantity,
    receivedQuantity: record.receivedQuantity,
    restockQuantity: record.restockQuantity,
    calculatedRefundAmount: money(record.calculatedRefundAmount),
    unitPrice: money(record.orderItem.unitPrice),
    isPromotionGift: record.orderItem.isPromotionGift,
  };
}

function toRefund(record: ReturnRecord["refund"]): RefundView | null {
  return record ? { id: record.id, status: record.status, method: record.method, amount: money(record.amount), reference: record.reference, processedAt: record.processedAt?.toISOString() ?? null } : null;
}

function toSummary(record: ReturnRecord): ReturnSummary {
  return {
    id: record.id,
    returnNumber: record.returnNumber,
    orderId: record.orderId,
    orderNumber: record.order.orderNumber,
    customerId: record.customerId,
    customerName: record.customer.name,
    customerEmail: record.customer.email,
    customerPhone: record.customer.phone,
    status: record.status,
    reason: record.reason,
    requestedAt: record.requestedAt.toISOString(),
    itemCount: record.items.length,
    requestedQuantity: record.items.reduce((sum, item) => sum + item.requestedQuantity, 0),
    estimatedRefundAmount: money(record.items.reduce((sum, item) => sum.add(item.calculatedRefundAmount), new Prisma.Decimal(0))),
    refundStatus: record.refund?.status ?? null,
  };
}

function toDetails(record: ReturnRecord, includeAdminNote: boolean): ReturnDetails {
  const summary = toSummary(record);
  const timeline: ReturnTimelineEntry[] = record.history.map((entry) => ({ id: entry.id, oldStatus: entry.oldStatus, newStatus: entry.newStatus, customerVisibleNote: entry.customerVisibleNote, createdAt: entry.createdAt.toISOString() }));
  return {
    ...summary,
    customerNote: record.customerNote,
    adminNote: includeAdminNote ? record.adminNote : null,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    rejectedAt: record.rejectedAt?.toISOString() ?? null,
    returningAt: record.returningAt?.toISOString() ?? null,
    receivedAt: record.receivedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    currency: record.order.currency,
    paymentStatus: record.order.paymentStatus,
    paymentMethodName: record.order.paymentMethodName,
    orderStatus: record.order.status,
    items: record.items.map(toItem),
    timeline,
    refund: toRefund(record.refund),
  };
}

function newReturnNumber(): string {
  return `RET-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export type RequestReturnInput = { orderNumber: string; customerId: string; items: { orderItemId: string; quantity: number }[]; reason: ReturnReason; customerNote?: string };
export type ApproveReturnInput = { id: string; items: { returnItemId: string; approvedQuantity: number }[]; customerNote?: string };
export type ReceiveReturnInput = { id: string; items: { returnItemId: string; receivedQuantity: number; restockQuantity: number }[] };

export class PrismaReturnRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}
  private audit = new AuditLogService(new PrismaAuditLogRepository());

  private async recordAudit(tx: Prisma.TransactionClient, audit: AuditMutationContext | undefined, input: Omit<AuditRecordInput, "actor">) {
    if (!audit) return;
    const logged = await this.audit.recordInTransaction(tx, { ...input, actor: audit.actor, requestId: audit.requestId });
    if (!logged.success) throw logged.error;
  }

  async getPolicy(): Promise<ReturnPolicy> { return getPolicy(this.db); }

  async findCustomerPage(customerId: string): Promise<CustomerReturnPage> {
    const [records, policy] = await Promise.all([
      this.db.returnRequest.findMany({ where: { customerId }, include: returnInclude, orderBy: { requestedAt: "desc" } }),
      getPolicy(this.db),
    ]);
    return { returns: records.map(toSummary), policy };
  }

  async findCustomerEligibleOrder(customerId: string, orderNumber: string): Promise<{ orderNumber: string; deliveredAt: string | null; eligibleUntil: string | null; policy: ReturnPolicy; items: EligibleReturnItem[] } | null> {
    const [order, policy] = await Promise.all([
      this.db.order.findFirst({ where: { customerId, orderNumber }, include: { shipment: { select: { deliveredAt: true } }, statusHistory: { select: { newStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } }, items: true, promotions: { select: { promotionType: true, ruleSnapshot: true } }, returnRequests: { where: { status: { notIn: ["REJECTED", "CANCELLED"] } }, include: { items: true } } } }),
      getPolicy(this.db),
    ]);
    if (!order) return null;
    const deliveredAt = deliveryDate(order);
    const eligibleUntil = deliveredAt ? new Date(deliveredAt.getTime() + policy.windowDays * 86400000) : null;
    const used = new Map<string, number>();
    for (const request of order.returnRequests) for (const item of request.items) used.set(item.orderItemId, (used.get(item.orderItemId) ?? 0) + (item.approvedQuantity ?? item.requestedQuantity));
    const paidGross = order.items.filter((item) => !item.isPromotionGift).reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantity)), new Prisma.Decimal(0));
    return {
      orderNumber: order.orderNumber,
      deliveredAt: deliveredAt?.toISOString() ?? null,
      eligibleUntil: eligibleUntil?.toISOString() ?? null,
      policy,
      items: order.items.map((item) => {
        const remaining = Math.max(0, item.quantity - (used.get(item.id) ?? 0));
        return { id: `eligible-${item.id}`, orderItemId: item.id, productName: item.name, imageUrl: item.imageUrl, orderQuantity: item.quantity, requestedQuantity: 0, approvedQuantity: null, receivedQuantity: 0, restockQuantity: 0, calculatedRefundAmount: money(RefundCalculator.lineRefund({ unitPrice: item.unitPrice, quantity: remaining, promotionDiscount: order.promotionDiscount, couponDiscount: order.couponDiscount, paidGross, isPromotionGift: item.isPromotionGift })), unitPrice: money(item.unitPrice), isPromotionGift: item.isPromotionGift, returnableQuantity: remaining };
      }).filter((item) => item.returnableQuantity > 0),
    };
  }

  async createRequest(input: RequestReturnInput): Promise<ReturnDetails> {
    const policy = await getPolicy(this.db);
    const record = await this.db.$transaction(async (tx) => {
      let order = await tx.order.findFirst({ where: { customerId: input.customerId, orderNumber: input.orderNumber }, include: { shipment: { select: { deliveredAt: true } }, statusHistory: { select: { newStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } }, items: true, promotions: { select: { promotionType: true, ruleSnapshot: true } }, returnRequests: { where: { status: { notIn: ["REJECTED", "CANCELLED"] } }, include: { items: true } } } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
      order = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipment: { select: { deliveredAt: true } }, statusHistory: { select: { newStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } }, items: true, promotions: { select: { promotionType: true, ruleSnapshot: true } }, returnRequests: { where: { status: { notIn: ["REJECTED", "CANCELLED"] } }, include: { items: true } } } });
      if (!isReturnEligibleOrder(order.status)) throw new Error("ORDER_NOT_ELIGIBLE");
      const deliveredAt = deliveryDate(order);
      if (!policy.enabled) throw new Error("RETURNS_DISABLED");
      if (!inReturnWindow(deliveredAt, policy.windowDays)) throw new Error("RETURN_WINDOW_CLOSED");
      const orderItems = new Map(order.items.map((item) => [item.id, item]));
      const used = new Map<string, number>();
      for (const request of order.returnRequests) for (const item of request.items) used.set(item.orderItemId, (used.get(item.orderItemId) ?? 0) + (item.approvedQuantity ?? item.requestedQuantity));
      const uniqueItems = new Map<string, number>();
      for (const item of input.items) uniqueItems.set(item.orderItemId, (uniqueItems.get(item.orderItemId) ?? 0) + item.quantity);
      const paidGross = order.items.filter((item) => !item.isPromotionGift).reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantity)), new Prisma.Decimal(0));
      const returnItems = [...uniqueItems.entries()].map(([orderItemId, quantity]) => {
        const item = orderItems.get(orderItemId);
        if (!item || quantity > item.quantity - (used.get(orderItemId) ?? 0)) throw new Error("RETURN_QUANTITY_INVALID");
        return { orderItemId, requestedQuantity: quantity, calculatedRefundAmount: RefundCalculator.lineRefund({ unitPrice: item.unitPrice, quantity, promotionDiscount: order.promotionDiscount, couponDiscount: order.couponDiscount, paidGross, isPromotionGift: item.isPromotionGift }) };
      });
      if (!returnItems.length) throw new Error("RETURN_ITEMS_REQUIRED");
      if (!hasRequiredPromotionGiftReturn({ orderItems: order.items, promotions: order.promotions, existingReturns: order.returnRequests, requestedItems: [...uniqueItems.entries()].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) })) throw new Error("PROMOTION_GIFT_RETURN_REQUIRED");
      return tx.returnRequest.create({ data: { returnNumber: newReturnNumber(), orderId: order.id, customerId: input.customerId, createdByUserId: input.customerId, reason: input.reason, customerNote: input.customerNote || null, items: { create: returnItems }, history: { create: { oldStatus: null, newStatus: "REQUESTED", changedByUserId: input.customerId, customerVisibleNote: "Return request submitted." } } }, include: returnInclude });
    });
    return toDetails(record, false);
  }

  async cancelCustomerRequest(customerId: string, id: string): Promise<ReturnDetails> {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.returnRequest.findFirst({ where: { id, customerId }, include: returnInclude });
      if (!current) throw new Error("RETURN_NOT_FOUND");
      if (current.status !== "REQUESTED") throw new Error("RETURN_TRANSITION_INVALID");
      await tx.returnRequest.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.returnStatusHistory.create({ data: { returnRequestId: id, oldStatus: "REQUESTED", newStatus: "CANCELLED", changedByUserId: customerId, customerVisibleNote: "Return request cancelled." } });
      return tx.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude });
    });
    return toDetails(record, false);
  }

  async findAdminPage(input: { page: number; status: string; search?: string; refundPending?: boolean }): Promise<AdminReturnPage> {
    const pageSize = 20;
    const search = input.search?.trim();
    const where: Prisma.ReturnRequestWhereInput = { ...(input.status !== "ALL" ? { status: input.status as ReturnStatus } : {}), ...(input.refundPending ? { refund: { status: "PENDING" } } : {}), ...(search ? { OR: [{ returnNumber: { contains: search, mode: "insensitive" } }, { order: { orderNumber: { contains: search, mode: "insensitive" } } }, { customer: { name: { contains: search, mode: "insensitive" } } }, { customer: { email: { contains: search, mode: "insensitive" } } }, { customer: { phone: { contains: search, mode: "insensitive" } } }] } : {}) };
    const [records, total, grouped, pending] = await Promise.all([
      this.db.returnRequest.findMany({ where, include: returnInclude, orderBy: { requestedAt: "desc" }, skip: (input.page - 1) * pageSize, take: pageSize }),
      this.db.returnRequest.count({ where }),
      this.db.returnRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      this.db.refund.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
    return { returns: records.map((record) => toSummary(record)), page: input.page, pageSize, total, kpis: { requested: counts.get("REQUESTED") ?? 0, awaitingReturn: counts.get("APPROVED") ?? 0, returning: counts.get("RETURNING") ?? 0, awaitingRefund: counts.get("RECEIVED") ?? 0, pendingRefundAmount: money(pending._sum.amount ?? new Prisma.Decimal(0)) } };
  }

  async findAdminDetails(id: string): Promise<ReturnDetails | null> { const record = await this.db.returnRequest.findUnique({ where: { id }, include: returnInclude }); return record ? toDetails(record, true) : null; }

  async findCustomerDetails(customerId: string, id: string): Promise<ReturnDetails | null> { const record = await this.db.returnRequest.findFirst({ where: { id, customerId }, include: returnInclude }); return record ? toDetails(record, false) : null; }

  async approve(input: ApproveReturnInput, actorId: string, audit?: AuditMutationContext): Promise<ReturnDetails> {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({ where: { id: input.id }, select: { returnNumber: true, status: true, items: { include: { orderItem: true } }, order: { select: { promotionDiscount: true, couponDiscount: true, items: true } } } });
      if (!current) throw new Error("RETURN_NOT_FOUND");
      if (current.status !== "REQUESTED") throw new Error("RETURN_TRANSITION_INVALID");
      const approved = new Map(input.items.map((item) => [item.returnItemId, item.approvedQuantity]));
      let approvedAny = false;
      for (const item of current.items) { const quantity = approved.get(item.id); if (quantity === undefined || quantity > item.requestedQuantity) throw new Error("APPROVED_QUANTITY_INVALID"); if (quantity > 0) approvedAny = true; }
      if (!approvedAny) throw new Error("APPROVED_QUANTITY_INVALID");
      const paidGross = current.order.items.filter((item) => !item.isPromotionGift).reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantity)), new Prisma.Decimal(0));
      await tx.returnRequest.update({ where: { id: input.id }, data: { status: "APPROVED", approvedAt: new Date(), adminNote: input.customerNote || null } });
      for (const item of current.items) {
        const approvedQuantity = approved.get(item.id) ?? 0;
        await tx.returnItem.update({ where: { id: item.id }, data: { approvedQuantity, calculatedRefundAmount: RefundCalculator.lineRefund({ unitPrice: item.orderItem.unitPrice, quantity: approvedQuantity, promotionDiscount: current.order.promotionDiscount, couponDiscount: current.order.couponDiscount, paidGross, isPromotionGift: item.orderItem.isPromotionGift }) } });
      }
      await tx.returnStatusHistory.create({ data: { returnRequestId: input.id, oldStatus: "REQUESTED", newStatus: "APPROVED", changedByUserId: actorId, customerVisibleNote: input.customerNote || "Your return request was approved." } });
      await this.recordAudit(tx, audit, { action: AUDIT_ACTIONS.RETURN_APPROVED, entityType: AUDIT_ENTITY_TYPES.RETURN, entityId: input.id, entityLabel: current.returnNumber, metadata: { itemCount: current.items.length } });
      return tx.returnRequest.findUniqueOrThrow({ where: { id: input.id }, include: returnInclude });
    });
    return toDetails(record, true);
  }

  async reject(id: string, actorId: string, customerVisibleNote: string, audit?: AuditMutationContext): Promise<ReturnDetails> { const record = await this.db.$transaction(async (tx) => { const current = await tx.returnRequest.findUnique({ where: { id }, select: { status: true, returnNumber: true } }); if (!current) throw new Error("RETURN_NOT_FOUND"); if (current.status !== "REQUESTED") throw new Error("RETURN_TRANSITION_INVALID"); await tx.returnRequest.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date(), adminNote: customerVisibleNote } }); await tx.returnStatusHistory.create({ data: { returnRequestId: id, oldStatus: "REQUESTED", newStatus: "REJECTED", changedByUserId: actorId, customerVisibleNote } }); await this.recordAudit(tx, audit, { action: AUDIT_ACTIONS.RETURN_REJECTED, entityType: AUDIT_ENTITY_TYPES.RETURN, entityId: id, entityLabel: current.returnNumber }); return tx.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude }); }); return toDetails(record, true); }

  async startReturn(id: string, actorId: string, audit?: AuditMutationContext): Promise<ReturnDetails> { return this.transitionAdmin(id, actorId, "RETURNING", "Return is on the way back.", audit); }

  private async transitionAdmin(id: string, actorId: string, status: ReturnStatus, customerVisibleNote: string, audit?: AuditMutationContext): Promise<ReturnDetails> { const record = await this.db.$transaction(async (tx) => { const current = await tx.returnRequest.findUnique({ where: { id }, select: { status: true, returnNumber: true } }); if (!current) throw new Error("RETURN_NOT_FOUND"); if (current.status !== "APPROVED") throw new Error("RETURN_TRANSITION_INVALID"); await tx.returnRequest.update({ where: { id }, data: { status, returningAt: new Date() } }); await tx.returnStatusHistory.create({ data: { returnRequestId: id, oldStatus: current.status, newStatus: status, changedByUserId: actorId, customerVisibleNote } }); await this.recordAudit(tx, audit, { action: AUDIT_ACTIONS.RETURN_RETURNING, entityType: AUDIT_ENTITY_TYPES.RETURN, entityId: id, entityLabel: current.returnNumber }); return tx.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude }); }); return toDetails(record, true); }

  async receive(input: ReceiveReturnInput, actorId: string, audit?: AuditMutationContext): Promise<ReturnDetails> {
    const record = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ReturnRequest" WHERE "id" = ${input.id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { id: input.id }, select: { returnNumber: true, status: true, items: { include: { orderItem: true } }, order: { select: { promotionDiscount: true, couponDiscount: true, items: true } } } });
      if (!current) throw new Error("RETURN_NOT_FOUND");
      if (!(current.status === "APPROVED" || current.status === "RETURNING")) throw new Error("RETURN_TRANSITION_INVALID");
      const values = new Map(input.items.map((item) => [item.returnItemId, item]));
      const paidGross = current.order.items.filter((item) => !item.isPromotionGift).reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantity)), new Prisma.Decimal(0));
      let refundAmount = new Prisma.Decimal(0);
      for (const item of current.items) { const value = values.get(item.id); if (!value || value.receivedQuantity > (item.approvedQuantity ?? 0) || value.restockQuantity > value.receivedQuantity) throw new Error("RECEIVED_QUANTITY_INVALID"); const itemRefund = RefundCalculator.lineRefund({ unitPrice: item.orderItem.unitPrice, quantity: value.receivedQuantity, promotionDiscount: current.order.promotionDiscount, couponDiscount: current.order.couponDiscount, paidGross, isPromotionGift: item.orderItem.isPromotionGift }); refundAmount = refundAmount.add(itemRefund); if (value.restockQuantity > 0 && item.orderItem.inventoryTrackedAtPurchase) { if (item.orderItem.variantId) await tx.productVariant.update({ where: { id: item.orderItem.variantId }, data: { stockQuantity: { increment: value.restockQuantity } } }); else await tx.product.update({ where: { id: item.orderItem.productId }, data: { stockQuantity: { increment: value.restockQuantity } } }); } await tx.returnItem.update({ where: { id: item.id }, data: { receivedQuantity: value.receivedQuantity, restockQuantity: value.restockQuantity, calculatedRefundAmount: itemRefund } }); }
      await tx.returnRequest.update({ where: { id: input.id }, data: { status: "RECEIVED", receivedAt: new Date() } });
      await tx.refund.upsert({ where: { returnRequestId: input.id }, create: { returnRequestId: input.id, amount: refundAmount }, update: {} });
      await tx.returnStatusHistory.create({ data: { returnRequestId: input.id, oldStatus: current.status, newStatus: "RECEIVED", changedByUserId: actorId, customerVisibleNote: "Your returned items were received." } });
      await this.recordAudit(tx, audit, { action: AUDIT_ACTIONS.RETURN_RECEIVED, entityType: AUDIT_ENTITY_TYPES.RETURN, entityId: input.id, entityLabel: current.returnNumber, metadata: { receivedQuantity: [...values.values()].reduce((sum, item) => sum + item.receivedQuantity, 0), restockQuantity: [...values.values()].reduce((sum, item) => sum + item.restockQuantity, 0), refundDue: refundAmount.toFixed(2) } });
      return tx.returnRequest.findUniqueOrThrow({ where: { id: input.id }, include: returnInclude });
    });
    return toDetails(record, true);
  }

  async completeRefund(id: string, actorId: string, method: RefundMethod, reference?: string, note?: string, audit?: AuditMutationContext): Promise<ReturnDetails> {
    const record = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ReturnRequest" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { id }, select: { returnNumber: true, status: true, refund: true, order: { select: { id: true, currency: true, subtotal: true, promotionDiscount: true, couponDiscount: true, paymentStatus: true } } } });
      if (!current) throw new Error("RETURN_NOT_FOUND");
      if (current.status !== "RECEIVED" || !current.refund || current.refund.status !== "PENDING") throw new Error("REFUND_NOT_READY");
      await tx.refund.update({ where: { id: current.refund.id }, data: { status: "COMPLETED", method, reference: reference || null, note: note || null, processedByUserId: actorId, processedAt: new Date() } });
      await tx.returnRequest.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
      await tx.returnStatusHistory.create({ data: { returnRequestId: id, oldStatus: "RECEIVED", newStatus: "COMPLETED", changedByUserId: actorId, customerVisibleNote: "Your refund has been completed." } });
      const completed = await tx.refund.aggregate({ where: { returnRequest: { orderId: current.order.id }, status: "COMPLETED" }, _sum: { amount: true } });
      const paidAmount = current.order.subtotal.sub(current.order.promotionDiscount).sub(current.order.couponDiscount);
      const nextPaymentStatus = (completed._sum.amount ?? new Prisma.Decimal(0)).gte(paidAmount) ? "REFUNDED" : "PARTIALLY_REFUNDED";
      if (current.order.paymentStatus !== nextPaymentStatus) { await tx.order.update({ where: { id: current.order.id }, data: { paymentStatus: nextPaymentStatus } }); await tx.paymentStatusHistory.create({ data: { orderId: current.order.id, oldStatus: current.order.paymentStatus, newStatus: nextPaymentStatus, changedByUserId: actorId, note: `Return refund ${current.refund.amount.toFixed(2)} completed.` } }); }
      await this.recordAudit(tx, audit, { action: AUDIT_ACTIONS.REFUND_COMPLETED, entityType: AUDIT_ENTITY_TYPES.REFUND, entityId: current.refund.id, entityLabel: current.returnNumber, metadata: { amount: current.refund.amount.toFixed(2), currency: current.order.currency, method } });
      return tx.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude });
    });
    return toDetails(record, true);
  }
}
