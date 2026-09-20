import "server-only";

import { Prisma, PrismaClient, type DeliveryFailureReason, type ShipmentStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { SettlementBatchInput } from "../schema";
import type {
  CodDueItem,
  ShipmentDetails,
  ShipmentHistoryEntry,
  ShipmentSummary,
  ShippingCompany,
  ShippingCompanyDetail,
  ShippingCompanyMetrics,
  ShippingOverview,
  SettlementSummary,
  ShippingCompanyDetailQuery,
  ShippingCarrierConfiguration,
} from "../types";

const shipmentInclude = {
  order: { select: { id: true, orderNumber: true, total: true, currency: true, paymentStatus: true, paymentMethodName: true, customer: { select: { name: true, email: true, phone: true } } } },
  shippingCompany: { select: { id: true, name: true } },
  statusHistory: { include: { changedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

type ShipmentRecord = Prisma.OrderShipmentGetPayload<{ include: typeof shipmentInclude }>;

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return value === null || value === undefined ? "0.00" : new Prisma.Decimal(value).toFixed(2);
}

function difference(expected: Prisma.Decimal | number | string, received: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(received).sub(new Prisma.Decimal(expected)).toFixed(2);
}

function toCompany(record: { id: string; code: string; name: string; nameAr: string | null; nameEn: string | null; phone: string | null; contactPerson: string | null; notes: string | null; isActive: boolean; createdAt: Date; updatedAt: Date }): ShippingCompany {
  return { id: record.id, code: record.code, name: record.name, nameAr: record.nameAr, nameEn: record.nameEn, phone: record.phone, contactPerson: record.contactPerson, notes: record.notes, isActive: record.isActive, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

function toHistory(record: ShipmentRecord["statusHistory"][number]): ShipmentHistoryEntry {
  return { id: record.id, oldStatus: record.oldStatus, newStatus: record.newStatus, changedByUserId: record.changedByUserId, changedByName: record.changedBy.name, changedByEmail: record.changedBy.email, note: record.note, createdAt: record.createdAt.toISOString() };
}

function toSummary(record: ShipmentRecord): ShipmentSummary {
  return {
    id: record.id,
    orderId: record.order.id,
    orderNumber: record.order.orderNumber,
    customerName: record.order.customer.name,
    customerEmail: record.order.customer.email,
    customerPhone: record.order.customer.phone,
    total: money(record.order.total),
    currency: record.order.currency,
    paymentStatus: record.order.paymentStatus,
    paymentMethodName: record.order.paymentMethodName,
    shippingCompanyId: record.shippingCompany?.id ?? null,
    shippingCompanyName: record.shippingCompany?.name ?? null,
    trackingNumber: record.trackingNumber,
    status: record.status,
    failureReason: record.failureReason,
    failureNote: record.failureNote,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toDetails(record: ShipmentRecord): ShipmentDetails {
  return {
    ...toSummary(record),
    handedToCarrierAt: record.handedToCarrierAt?.toISOString() ?? null,
    outForDeliveryAt: record.outForDeliveryAt?.toISOString() ?? null,
    deliveredAt: record.deliveredAt?.toISOString() ?? null,
    failedAt: record.failedAt?.toISOString() ?? null,
    returnStartedAt: record.returnStartedAt?.toISOString() ?? null,
    returnedToStoreAt: record.returnedToStoreAt?.toISOString() ?? null,
    inventoryRestoredAt: record.inventoryRestoredAt?.toISOString() ?? null,
    history: record.statusHistory.map(toHistory),
  };
}

export interface ShippingRepository {
  listOverview(): Promise<ShippingOverview>;
  findCompanyDetail(id: string, query?: ShippingCompanyDetailQuery): Promise<ShippingCompanyDetail | null>;
  findCompanies(): Promise<ShippingCompany[]>;
  findShipmentByOrderId(orderId: string): Promise<ShipmentDetails | null>;
  createCompany(input: { code?: string; name: string; nameAr?: string; nameEn?: string; phone?: string; contactPerson?: string; notes?: string }): Promise<ShippingCompany>;
  updateCompany(id: string, input: { code?: string; name: string; nameAr?: string; nameEn?: string; phone?: string; contactPerson?: string; notes?: string; isActive: boolean }): Promise<ShippingCompany>;
  findCarrierConfigurations(): Promise<ShippingCarrierConfiguration[]>;
  updateCarrierConfiguration(input: import("../schema").UpdateShippingCarrierConfigurationInput): Promise<ShippingCarrierConfiguration>;
  deleteCompany(id: string): Promise<void>;
  assignShipment(orderId: string, companyId: string, trackingNumber?: string): Promise<ShipmentDetails>;
  transitionShipment(orderId: string, status: ShipmentStatus, actorId: string, failureReason?: DeliveryFailureReason, note?: string): Promise<ShipmentDetails>;
  receiveSettlement(input: SettlementBatchInput, actorId: string): Promise<SettlementSummary>;
  receiveReturns(companyId: string, orderIds: string[], actorId: string): Promise<ShipmentDetails[]>;
}

export class PrismaShippingRepository implements ShippingRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findCompanies() {
    return (await this.db.shippingCompany.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] })).map(toCompany);
  }

  async listOverview() {
    const companies = await this.db.shippingCompany.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const metrics = await Promise.all(companies.map(async (company) => {
      const [withCarrier, outForDelivery, delivered, failed, returnsPending, due] = await Promise.all([
        this.db.orderShipment.count({ where: { shippingCompanyId: company.id, status: "WITH_CARRIER" } }),
        this.db.orderShipment.count({ where: { shippingCompanyId: company.id, status: "OUT_FOR_DELIVERY" } }),
        this.db.orderShipment.count({ where: { shippingCompanyId: company.id, status: "DELIVERED" } }),
        this.db.orderShipment.count({ where: { shippingCompanyId: company.id, status: "DELIVERY_FAILED" } }),
        this.db.orderShipment.count({ where: { shippingCompanyId: company.id, status: { in: ["DELIVERY_FAILED", "RETURNING"] } } }),
        this.db.paymentSettlement.aggregate({ where: { status: "PENDING_SETTLEMENT", order: { paymentStatus: "PAID", paymentMethod: { is: { type: "CASH_ON_DELIVERY" } }, shipment: { is: { shippingCompanyId: company.id, status: "DELIVERED" } } } }, _sum: { amount: true } }),
      ]);
      return { ...toCompany(company), withCarrier: withCarrier + outForDelivery, outForDelivery, delivered, failed, returnsPending, codDue: money(due._sum.amount) } satisfies ShippingCompanyMetrics;
    }));
    const deliveredToday = await this.db.orderShipment.count({ where: { status: "DELIVERED", deliveredAt: { gte: today } } });
    return { totals: { companies: companies.length, withCarrier: metrics.reduce((sum, item) => sum + item.withCarrier, 0), codDue: metrics.reduce((sum, item) => sum + Number(item.codDue), 0).toFixed(2), returnsPending: metrics.reduce((sum, item) => sum + item.returnsPending, 0), deliveredToday }, companies: metrics, configurations: await this.findCarrierConfigurations() } satisfies ShippingOverview;
  }

  async findCarrierConfigurations() {
    const records = await this.db.shippingCompany.findMany({ include: { marketConfigs: { orderBy: { market: "asc" } } }, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return records.map((record) => ({ ...toCompany(record), markets: record.marketConfigs.map((config) => ({ market: config.market, enabled: config.enabled, isCheckoutCarrier: config.isCheckoutCarrier, rate: config.rate.toFixed(2) })) })) satisfies ShippingCarrierConfiguration[];
  }

  async updateCarrierConfiguration(input: import("../schema").UpdateShippingCarrierConfigurationInput) {
    return this.db.$transaction(async (tx) => {
      const company = await tx.shippingCompany.update({ where: { id: input.id }, data: { code: input.code, name: input.name, nameAr: input.nameAr || null, nameEn: input.nameEn || null, isActive: input.isActive } });
      for (const market of ["SAUDI_ARABIA", "EGYPT"] as const) {
        const config = input.markets[market];
        if (config.enabled && config.isCheckoutCarrier) await tx.shippingCarrierMarketConfig.updateMany({ where: { market, isCheckoutCarrier: true, NOT: { shippingCompanyId: input.id } }, data: { isCheckoutCarrier: false } });
        await tx.shippingCarrierMarketConfig.upsert({ where: { shippingCompanyId_market: { shippingCompanyId: input.id, market } }, create: { shippingCompanyId: input.id, market, enabled: config.enabled, isCheckoutCarrier: config.isCheckoutCarrier, rate: new Prisma.Decimal(config.rate) }, update: { enabled: config.enabled, isCheckoutCarrier: config.isCheckoutCarrier, rate: new Prisma.Decimal(config.rate) } });
      }
      const full = await tx.shippingCompany.findUnique({ where: { id: company.id }, include: { marketConfigs: { orderBy: { market: "asc" } } } });
      if (!full) throw new Error("COMPANY_NOT_FOUND");
      return { ...toCompany(full), markets: full.marketConfigs.map((config) => ({ market: config.market, enabled: config.enabled, isCheckoutCarrier: config.isCheckoutCarrier, rate: config.rate.toFixed(2) })) } satisfies ShippingCarrierConfiguration;
    });
  }

  async findCompanyDetail(id: string, query: ShippingCompanyDetailQuery = {}) {
    const company = await this.db.shippingCompany.findUnique({ where: { id } });
    if (!company) return null;
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 25));
    const search = query.search?.trim();
    const shipmentWhere: Prisma.OrderShipmentWhereInput = { shippingCompanyId: id, ...(query.status ? { status: query.status } : {}), ...(search ? { OR: [{ trackingNumber: { contains: search, mode: "insensitive" } }, { order: { is: { orderNumber: { contains: search, mode: "insensitive" } } } }, { order: { is: { customer: { is: { name: { contains: search, mode: "insensitive" } } } } } }, { order: { is: { customer: { is: { phone: { contains: search, mode: "insensitive" } } } } } }] } : {}) };
    const [withCarrier, outForDelivery, delivered, failed, returnsPending, due, shipmentTotal, records, codRecords, returnRecords, settlementRecords] = await Promise.all([
      this.db.orderShipment.count({ where: { shippingCompanyId: id, status: "WITH_CARRIER" } }),
      this.db.orderShipment.count({ where: { shippingCompanyId: id, status: "OUT_FOR_DELIVERY" } }),
      this.db.orderShipment.count({ where: { shippingCompanyId: id, status: "DELIVERED" } }),
      this.db.orderShipment.count({ where: { shippingCompanyId: id, status: "DELIVERY_FAILED" } }),
      this.db.orderShipment.count({ where: { shippingCompanyId: id, status: { in: ["DELIVERY_FAILED", "RETURNING"] } } }),
      this.db.paymentSettlement.aggregate({ where: { status: "PENDING_SETTLEMENT", order: { paymentStatus: "PAID", paymentMethod: { is: { type: "CASH_ON_DELIVERY" } }, shipment: { is: { shippingCompanyId: id, status: "DELIVERED" } } } }, _sum: { amount: true } }),
      this.db.orderShipment.count({ where: shipmentWhere }),
      this.db.orderShipment.findMany({ where: shipmentWhere, include: shipmentInclude, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.paymentSettlement.findMany({ where: { status: "PENDING_SETTLEMENT", order: { paymentStatus: "PAID", paymentMethod: { is: { type: "CASH_ON_DELIVERY" } }, shipment: { is: { shippingCompanyId: id, status: "DELIVERED" } } } }, include: { order: { include: { shipment: true, customer: { select: { name: true } } } } }, orderBy: { createdAt: "asc" }, take: 100 }),
      this.db.orderShipment.findMany({ where: { shippingCompanyId: id, status: { in: ["DELIVERY_FAILED", "RETURNING", "RETURNED_TO_STORE"] } }, include: shipmentInclude, orderBy: { updatedAt: "desc" }, take: 100 }),
      this.db.carrierSettlementBatch.findMany({ where: { shippingCompanyId: id }, include: { createdBy: { select: { name: true, email: true } }, _count: { select: { items: true } } }, orderBy: { receivedAt: "desc" }, take: 50 }),
    ]);
    const codDue = codRecords.map((record) => ({ orderId: record.orderId, orderNumber: record.order.orderNumber, customerName: record.order.customer.name, total: money(record.order.total), currency: record.order.currency, settlementId: record.id, amount: money(record.amount), deliveredAt: record.order.shipment?.deliveredAt?.toISOString() ?? null } satisfies CodDueItem));
    const settlements = settlementRecords.map((record) => ({ id: record.id, reference: record.reference, expectedAmount: money(record.expectedAmount), receivedAmount: money(record.receivedAmount), difference: difference(record.expectedAmount, record.receivedAmount), receivedAt: record.receivedAt.toISOString(), note: record.note, createdByName: record.createdBy.name, createdByEmail: record.createdBy.email, orderCount: record._count.items } satisfies SettlementSummary));
    return { company: toCompany(company), metrics: { withCarrier: withCarrier + outForDelivery, outForDelivery, delivered, failed, returnsPending, codDue: money(due._sum.amount) }, shipments: records.map(toSummary), shipmentTotal, codDue, codDueTotal: money(due._sum.amount), returns: returnRecords.map(toSummary), settlements } satisfies ShippingCompanyDetail;
  }

  async findShipmentByOrderId(orderId: string) {
    const record = await this.db.orderShipment.findUnique({ where: { orderId }, include: shipmentInclude });
    return record ? toDetails(record) : null;
  }

  async createCompany(input: { code?: string; name: string; nameAr?: string; nameEn?: string; phone?: string; contactPerson?: string; notes?: string }) {
    return toCompany(await this.db.shippingCompany.create({ data: { code: input.code || undefined, name: input.name, nameAr: input.nameAr || null, nameEn: input.nameEn || null, phone: input.phone || null, contactPerson: input.contactPerson || null, notes: input.notes || null } }));
  }

  async updateCompany(id: string, input: { code?: string; name: string; nameAr?: string; nameEn?: string; phone?: string; contactPerson?: string; notes?: string; isActive: boolean }) {
    return toCompany(await this.db.shippingCompany.update({ where: { id }, data: { code: input.code || undefined, name: input.name, nameAr: input.nameAr || null, nameEn: input.nameEn || null, phone: input.phone || null, contactPerson: input.contactPerson || null, notes: input.notes || null, isActive: input.isActive } }));
  }

  async deleteCompany(id: string) {
    const [shipmentCount, batchCount] = await Promise.all([this.db.orderShipment.count({ where: { shippingCompanyId: id } }), this.db.carrierSettlementBatch.count({ where: { shippingCompanyId: id } })]);
    if (shipmentCount || batchCount) throw new Error("COMPANY_HAS_HISTORY");
    await this.db.shippingCompany.delete({ where: { id } });
  }

  async assignShipment(orderId: string, companyId: string, trackingNumber?: string) {
    const record = await this.db.$transaction(async (tx) => {
      const [order, company, existing] = await Promise.all([
        tx.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } }),
        tx.shippingCompany.findUnique({ where: { id: companyId } }),
        tx.orderShipment.findUnique({ where: { orderId }, select: { id: true, shippingCompanyId: true, status: true } }),
      ]);
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (!company) throw new Error("COMPANY_NOT_FOUND");
      if (!company.isActive) throw new Error("COMPANY_INACTIVE");
      if (existing && existing.status !== "NOT_ASSIGNED" && existing.status !== "READY_FOR_SHIPPING" && existing.shippingCompanyId !== companyId) throw new Error("SHIPMENT_ALREADY_HANDED_OVER");
      return existing
        ? tx.orderShipment.update({ where: { id: existing.id }, data: { shippingCompanyId: companyId, trackingNumber: trackingNumber?.trim() || null }, include: shipmentInclude })
        : tx.orderShipment.create({ data: { orderId, shippingCompanyId: companyId, trackingNumber: trackingNumber?.trim() || null }, include: shipmentInclude });
    });
    return toDetails(record);
  }

  async transitionShipment(orderId: string, status: ShipmentStatus, actorId: string, failureReason?: DeliveryFailureReason, note?: string) {
    const record = await this.db.$transaction(async (tx) => this.transitionInTransaction(tx, orderId, status, actorId, failureReason, note));
    return toDetails(record);
  }

  private async transitionInTransaction(tx: Prisma.TransactionClient, orderId: string, status: ShipmentStatus, actorId: string, failureReason?: DeliveryFailureReason, note?: string) {
    const current = await tx.orderShipment.findUnique({ where: { orderId }, include: { order: { include: { items: true, paymentMethod: true } }, shippingCompany: true } });
    if (!current) throw new Error("SHIPMENT_NOT_FOUND");
    if (current.status === status) return tx.orderShipment.findUniqueOrThrow({ where: { id: current.id }, include: shipmentInclude });
    const allowed: Record<ShipmentStatus, readonly ShipmentStatus[]> = { NOT_ASSIGNED: ["READY_FOR_SHIPPING"], READY_FOR_SHIPPING: ["WITH_CARRIER"], WITH_CARRIER: ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"], OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"], DELIVERED: [], DELIVERY_FAILED: ["RETURNING"], RETURNING: ["RETURNED_TO_STORE"], RETURNED_TO_STORE: [] };
    if (!allowed[current.status].includes(status)) throw new Error("INVALID_SHIPMENT_TRANSITION");
    if (["WITH_CARRIER", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED", "RETURNING", "RETURNED_TO_STORE"].includes(status) && !current.shippingCompanyId) throw new Error("SHIPPING_COMPANY_REQUIRED");
    if (status === "DELIVERY_FAILED" && !failureReason) throw new Error("FAILURE_REASON_REQUIRED");
    const now = new Date();
    const data: Prisma.OrderShipmentUpdateInput = { status, updatedAt: now };
    if (status === "WITH_CARRIER") data.handedToCarrierAt = now;
    if (status === "OUT_FOR_DELIVERY") data.outForDeliveryAt = now;
    if (status === "DELIVERED") data.deliveredAt = now;
    if (status === "DELIVERY_FAILED") { data.failedAt = now; data.failureReason = failureReason; data.failureNote = note?.trim() || null; }
    if (status === "RETURNING") data.returnStartedAt = now;
    if (status === "RETURNED_TO_STORE") { data.returnedToStoreAt = now; if (!current.inventoryRestoredAt) data.inventoryRestoredAt = now; }
    if (status === "RETURNED_TO_STORE" && !current.inventoryRestoredAt) for (const item of current.order.items) if (item.inventoryTrackedAtPurchase) await tx.product.updateMany({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
    await tx.orderShipment.update({ where: { id: current.id }, data, include: shipmentInclude });
    await tx.shipmentStatusHistory.create({ data: { shipmentId: current.id, oldStatus: current.status, newStatus: status, changedByUserId: actorId, note: note?.trim() || null } });
    const syncedStatus: Partial<Record<ShipmentStatus, "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED">> = { WITH_CARRIER: "SHIPPED", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED", RETURNED_TO_STORE: "CANCELLED" };
    const nextOrderStatus = syncedStatus[status];
    if (nextOrderStatus && current.order.status !== nextOrderStatus) { await tx.order.update({ where: { id: orderId }, data: { status: nextOrderStatus } }); await tx.orderStatusHistory.create({ data: { orderId, oldStatus: current.order.status, newStatus: nextOrderStatus, changedByUserId: actorId, note: `Synchronized from shipment status ${status}.` } }); }
    if (status === "RETURNED_TO_STORE") await tx.couponRedemption.updateMany({ where: { orderId, status: "REDEEMED" }, data: { status: "REVERSED", reversedAt: now } });
    if (status === "DELIVERED" && current.order.paymentMethod?.type === "CASH_ON_DELIVERY") { if (current.order.paymentStatus !== "PAID") { await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID", paidAt: now } }); await tx.paymentStatusHistory.create({ data: { orderId, oldStatus: current.order.paymentStatus, newStatus: "PAID", changedByUserId: actorId, note: "COD payment collected on delivery." } }); } await tx.paymentSettlement.upsert({ where: { orderId }, create: { orderId, amount: current.order.total, status: "PENDING_SETTLEMENT" }, update: {} }); }
    const notifications: Record<string, { type: "ORDER_SHIPPED" | "ORDER_OUT_FOR_DELIVERY" | "ORDER_DELIVERED" | "ORDER_DELIVERY_FAILED" | "ORDER_RETURNED_TO_STORE"; message: string }> = { WITH_CARRIER: { type: "ORDER_SHIPPED", message: "Your order has been handed to the shipping company." }, OUT_FOR_DELIVERY: { type: "ORDER_OUT_FOR_DELIVERY", message: "Your order is out for delivery." }, DELIVERED: { type: "ORDER_DELIVERED", message: "Your order was delivered." }, DELIVERY_FAILED: { type: "ORDER_DELIVERY_FAILED", message: "The delivery attempt was not successful." }, RETURNED_TO_STORE: { type: "ORDER_RETURNED_TO_STORE", message: "Your returned order was received by the store." } };
    const notification = notifications[status];
    if (notification) { const dedupeKey = `order:${orderId}:${nextOrderStatus ? `status:${nextOrderStatus}` : `shipment:${status}`}`; await tx.notification.upsert({ where: { dedupeKey }, update: {}, create: { userId: current.order.customerId, type: notification.type, title: `Order #${current.order.orderNumber} update`, message: notification.message, href: `/account/orders/${encodeURIComponent(current.order.orderNumber)}`, dedupeKey } }); }
    return tx.orderShipment.findUniqueOrThrow({ where: { id: current.id }, include: shipmentInclude });
  }

  async receiveSettlement(input: SettlementBatchInput, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const orderIds = [...new Set(input.orderIds)];
      if (orderIds.length !== input.orderIds.length) throw new Error("DUPLICATE_SETTLEMENT_ORDER");
      const orders = await tx.order.findMany({ where: { id: { in: orderIds } }, include: { paymentMethod: true, shipment: true, settlement: true, settlementItem: true } });
      if (orders.length !== orderIds.length || orders.some((order) => order.shipment?.shippingCompanyId !== input.shippingCompanyId || order.shipment.status !== "DELIVERED" || order.paymentMethod?.type !== "CASH_ON_DELIVERY" || order.paymentStatus !== "PAID" || order.settlement?.status !== "PENDING_SETTLEMENT" || order.settlementItem)) throw new Error("INELIGIBLE_SETTLEMENT_ORDER");
      const expected = orders.reduce((sum, order) => sum.add(order.settlement?.amount ?? order.total), new Prisma.Decimal(0));
      const received = new Prisma.Decimal(input.receivedAmount);
      const batch = await tx.carrierSettlementBatch.create({ data: { shippingCompanyId: input.shippingCompanyId, reference: input.reference || null, expectedAmount: expected, receivedAmount: received, receivedAt: input.receivedAt, note: input.note || null, createdByUserId: actorId, items: { create: orders.map((order) => ({ orderId: order.id, expectedAmount: order.settlement?.amount ?? order.total })) } }, include: { createdBy: { select: { name: true, email: true } }, _count: { select: { items: true } } } });
      await tx.paymentSettlement.updateMany({ where: { orderId: { in: orderIds }, status: "PENDING_SETTLEMENT" }, data: { status: "SETTLED", settledByUserId: actorId, settledAt: input.receivedAt, note: input.note || null } });
      return { id: batch.id, reference: batch.reference, expectedAmount: money(batch.expectedAmount), receivedAmount: money(batch.receivedAmount), difference: difference(batch.expectedAmount, batch.receivedAmount), receivedAt: batch.receivedAt.toISOString(), note: batch.note, createdByName: batch.createdBy.name, createdByEmail: batch.createdBy.email, orderCount: batch._count.items } satisfies SettlementSummary;
    });
  }

  async receiveReturns(companyId: string, orderIds: string[], actorId: string) {
    const uniqueIds = [...new Set(orderIds)];
    if (uniqueIds.length !== orderIds.length) throw new Error("DUPLICATE_RETURN_ORDER");
    return this.db.$transaction(async (tx) => {
      const shipments = await tx.orderShipment.findMany({ where: { orderId: { in: uniqueIds } }, select: { orderId: true, shippingCompanyId: true, status: true } });
      if (shipments.length !== uniqueIds.length || shipments.some((shipment) => shipment.shippingCompanyId !== companyId || !["RETURNING", "RETURNED_TO_STORE"].includes(shipment.status))) throw new Error("INELIGIBLE_RETURN_ORDER");
      for (const shipment of shipments) if (shipment.status === "RETURNING") await this.transitionInTransaction(tx, shipment.orderId, "RETURNED_TO_STORE", actorId, undefined, "Return received by the store.");
      const records = await tx.orderShipment.findMany({ where: { orderId: { in: uniqueIds } }, include: shipmentInclude });
      return records.map(toDetails);
    });
  }
}
