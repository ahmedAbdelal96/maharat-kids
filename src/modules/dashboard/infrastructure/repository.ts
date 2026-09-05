import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import {
  LOW_STOCK_THRESHOLD,
  RECENT_CUSTOMER_DAYS,
  SALES_DAYS,
} from "../constants";
import type {
  DashboardData,
  DashboardKpis,
  DashboardLowStockProduct,
  DashboardPendingActions,
  DashboardRecentOrder,
  DashboardSalesPoint,
  DashboardTopProduct,
} from "../types";

type RevenueWhere = {
  status: { not: "CANCELLED" };
  paymentStatus: "PAID";
};

function startOfToday(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(1);
  return value;
}

function startOfSalesPeriod(date: Date) {
  const value = startOfToday(date);
  value.setDate(value.getDate() - (SALES_DAYS - 1));
  return value;
}

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function toSalesPoint(row: { date: Date; revenue: Prisma.Decimal | number | string }, locale: string): DashboardSalesPoint {
  return {
    date: row.date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(row.date),
    revenue: money(row.revenue),
  };
}

export interface DashboardRepository {
  getOverview(currency: string): Promise<DashboardData>;
}

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async getOverview(currency: string) {
    const now = new Date();
    const today = startOfToday(now);
    const month = startOfMonth(now);
    const salesStart = startOfSalesPeriod(now);
    const recentCustomerStart = new Date(now);
    recentCustomerStart.setDate(recentCustomerStart.getDate() - RECENT_CUSTOMER_DAYS);
    const revenueWhere: RevenueWhere = { status: { not: "CANCELLED" }, paymentStatus: "PAID" };

    const [
      totalRevenue,
      todayRevenue,
      monthRevenue,
      settledCod,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      totalCustomers,
      recentCustomers,
      activeProducts,
      lowStockProducts,
      pendingConfirmation,
      unpaidManualTransfers,
      pendingVerification,
      pendingCodSettlements,
      outForDelivery,
      withCarriers,
      codDueFromCarriers,
      returnsWithCarriers,
      recentOrders,
      lowStockRecords,
      salesRows,
      topProductRows,
    ] = await Promise.all([
      this.db.order.aggregate({ where: revenueWhere, _sum: { total: true } }),
      this.db.order.aggregate({ where: { ...revenueWhere, createdAt: { gte: today } }, _sum: { total: true } }),
      this.db.order.aggregate({ where: { ...revenueWhere, createdAt: { gte: month } }, _sum: { total: true } }),
      this.db.paymentSettlement.aggregate({ where: { status: "SETTLED", order: { paymentMethod: { is: { type: "CASH_ON_DELIVERY" } } } }, _sum: { amount: true } }),
      this.db.order.count(),
      this.db.order.count({ where: { status: "PENDING" } }),
      this.db.order.count({ where: { status: "PROCESSING" } }),
      this.db.order.count({ where: { status: "DELIVERED" } }),
      this.db.user.count({ where: { type: "CUSTOMER" } }),
      this.db.user.count({ where: { type: "CUSTOMER", createdAt: { gte: recentCustomerStart } } }),
      this.db.product.count({ where: { status: "ACTIVE" } }),
      this.db.product.count({ where: { status: "ACTIVE", trackInventory: true, stockQuantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      this.db.order.count({ where: { status: "PENDING" } }),
      this.db.order.count({ where: { paymentStatus: { in: ["PENDING", "PENDING_VERIFICATION"] }, paymentMethod: { is: { type: "MANUAL_TRANSFER" } } } }),
      this.db.order.count({ where: { paymentStatus: "PENDING_VERIFICATION", paymentMethod: { is: { type: "MANUAL_TRANSFER" } } } }),
      this.db.paymentSettlement.count({ where: { status: "PENDING_SETTLEMENT" } }),
      this.db.order.count({ where: { status: "OUT_FOR_DELIVERY" } }),
      this.db.orderShipment.count({ where: { status: { in: ["WITH_CARRIER", "OUT_FOR_DELIVERY"] } } }),
      this.db.paymentSettlement.aggregate({ where: { status: "PENDING_SETTLEMENT", order: { paymentStatus: "PAID", paymentMethod: { is: { type: "CASH_ON_DELIVERY" } }, shipment: { is: { status: "DELIVERED" } } } }, _sum: { amount: true } }),
      this.db.orderShipment.count({ where: { status: { in: ["DELIVERY_FAILED", "RETURNING"] } } }),
      this.db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          paymentStatus: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
        },
      }),
      this.db.product.findMany({
        where: { status: "ACTIVE", trackInventory: true, stockQuantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true, media: { select: { url: true } } },
          },
        },
      }),
      this.db.$queryRaw<{ date: Date; revenue: Prisma.Decimal }[]>`
        SELECT DATE_TRUNC('day', o."createdAt") AS date,
               COALESCE(SUM(o."total"), 0) AS revenue
        FROM "Order" o
        WHERE o."createdAt" >= ${salesStart}
          AND o."status" <> 'CANCELLED'
          AND o."paymentStatus" = 'PAID'
        GROUP BY DATE_TRUNC('day', o."createdAt")
        ORDER BY date ASC
      `,
      this.db.$queryRaw<{ productId: string; name: string; imageUrl: string | null; quantitySold: number; revenue: Prisma.Decimal; currency: string }[]>`
        SELECT oi."productId" AS "productId",
               oi."name" AS name,
               MAX(oi."imageUrl") AS "imageUrl",
               SUM(oi."quantity")::int AS "quantitySold",
               SUM(oi."unitPrice" * oi."quantity") AS revenue,
               MAX(o."currency") AS currency
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o."id" = oi."orderId"
        WHERE o."status" <> 'CANCELLED'
          AND o."paymentStatus" = 'PAID'
        GROUP BY oi."productId", oi."name"
        ORDER BY "quantitySold" DESC, revenue DESC
        LIMIT 5
      `,
    ]);

    const kpis: DashboardKpis = {
      revenue: {
        total: money(totalRevenue._sum.total),
        today: money(todayRevenue._sum.total),
        month: money(monthRevenue._sum.total),
        settledCod: money(settledCod._sum.amount),
      },
      orders: { total: totalOrders, pending: pendingOrders, processing: processingOrders, delivered: deliveredOrders },
      customers: { total: totalCustomers, recent: recentCustomers },
      products: { active: activeProducts, lowStock: lowStockProducts },
    };

    const pendingActions: DashboardPendingActions = {
      pendingConfirmation,
      unpaidManualTransfers,
      pendingVerification,
      pendingCodSettlements,
      outForDelivery,
      lowStockProducts,
      withCarriers,
      codDueFromCarriers: money(codDueFromCarriers._sum.amount),
      returnsWithCarriers,
    };

    const recent: DashboardRecentOrder[] = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      total: order.total.toFixed(2),
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.status,
      createdAt: order.createdAt.toISOString(),
    }));

    const lowStock: DashboardLowStockProduct[] = lowStockRecords.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      imageUrl: product.images[0]?.media?.url ?? product.images[0]?.url ?? null,
    }));

    const salesByDate = new Map(salesRows.map((row) => [row.date.toISOString().slice(0, 10), row]));
    const sales: DashboardSalesPoint[] = Array.from({ length: SALES_DAYS }, (_, index) => {
      const date = new Date(salesStart);
      date.setDate(salesStart.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return toSalesPoint(salesByDate.get(key) ?? { date, revenue: 0 }, "en-US");
    });

    const topProducts: DashboardTopProduct[] = topProductRows.map((product) => ({
      productId: product.productId,
      name: product.name,
      imageUrl: product.imageUrl,
      quantitySold: Number(product.quantitySold),
      revenue: money(product.revenue),
      currency: product.currency || currency,
    }));

    return { currency, kpis, recentOrders: recent, pendingActions, sales, topProducts, lowStockProducts: lowStock };
  }
}
