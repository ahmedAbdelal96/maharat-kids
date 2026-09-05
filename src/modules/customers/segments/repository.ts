import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import { baseProfile, money, profileSelect, qualifyingPaidOrderWhere } from "../intelligence/repository";
import type { CustomerSegmentPage, CustomerSegmentQuery, CustomerSegmentRow, CustomerSegmentSummary } from "./types";
import { customerSegmentDefinitions, defaultHighValueThreshold, getCustomerSegmentDefinition } from "./constants";

const pageSize = 20;
type PaidMetric = { customerId: string; paidOrderCount: number; totalSpent: Prisma.Decimal };
type OrderMetric = { orderCount: number; paidOrderCount: number; totalSpent: Prisma.Decimal };

function cutoffDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function searchWhere(term: string | undefined): Prisma.UserWhereInput {
  const search = term?.trim();
  return search ? { OR: [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
    { phone: { contains: search, mode: "insensitive" } },
  ] } : {};
}

function decimal(value: string | undefined, fallback = "0") {
  try { return new Prisma.Decimal(value ?? fallback); } catch { return new Prisma.Decimal(fallback); }
}

export interface CustomerSegmentsRepository {
  getCounts(query: CustomerSegmentQuery): Promise<Array<(typeof customerSegmentDefinitions)[number] & { count: number }>>;
  findAudience(query: CustomerSegmentQuery): Promise<Omit<CustomerSegmentPage, "definitions" | "canExport">>;
  buildExportRows(query: CustomerSegmentQuery): Promise<CustomerSegmentRow[]>;
}

export class PrismaCustomerSegmentsRepository implements CustomerSegmentsRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private async paidMetrics(ids: string[]) {
    if (ids.length === 0) return new Map<string, PaidMetric>();
    const rows = await this.db.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, ...qualifyingPaidOrderWhere },
      _count: { _all: true },
      _sum: { total: true },
    });
    return new Map(rows.map((row) => [row.customerId, { customerId: row.customerId, paidOrderCount: row._count._all, totalSpent: row._sum.total ?? new Prisma.Decimal(0) }]));
  }

  private async orderMetrics(ids: string[]) {
    if (ids.length === 0) return new Map<string, OrderMetric>();
    const [all, paid] = await Promise.all([
      this.db.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _count: { _all: true } }),
      this.db.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, ...qualifyingPaidOrderWhere }, _count: { _all: true }, _sum: { total: true } }),
    ]);
    const paidById = new Map(paid.map((row) => [row.customerId, row]));
    return new Map(all.map((row) => {
      const paidRow = paidById.get(row.customerId);
      return [row.customerId, { orderCount: row._count._all, paidOrderCount: paidRow?._count._all ?? 0, totalSpent: paidRow?._sum.total ?? new Prisma.Decimal(0) }];
    }));
  }

  private async resolveSegmentIds(query: CustomerSegmentQuery): Promise<string[]> {
    const base = { type: "CUSTOMER" as const };
    const paidRows = ["purchased", "repeat", "high_value"].includes(query.segment)
      ? await this.db.order.groupBy({ by: ["customerId"], where: { customer: { type: "CUSTOMER" }, ...qualifyingPaidOrderWhere }, _count: { _all: true }, _sum: { total: true } })
      : [];

    if (query.segment === "purchased") return paidRows.map((row) => row.customerId);
    if (query.segment === "repeat") return paidRows.filter((row) => row._count._all >= 2).map((row) => row.customerId);
    if (query.segment === "high_value") {
      const threshold = decimal(query.highValueThreshold, defaultHighValueThreshold);
      return paidRows.filter((row) => (row._sum.total ?? new Prisma.Decimal(0)).gte(threshold)).map((row) => row.customerId);
    }
    if (query.segment === "never_purchased") {
      const rows = await this.db.user.findMany({ where: { ...base, orders: { none: qualifyingPaidOrderWhere } }, select: { id: true } });
      return rows.map((row) => row.id);
    }
    if (query.segment === "favorites_without_purchase") {
      const rows = await this.db.user.findMany({ where: { ...base, favorites: { some: {} }, orders: { none: qualifyingPaidOrderWhere } }, select: { id: true } });
      return rows.map((row) => row.id);
    }
    if (query.segment === "marketing_opted_in") {
      const rows = await this.db.user.findMany({ where: { ...base, marketingConsent: true }, select: { id: true } });
      return rows.map((row) => row.id);
    }
    if (query.segment === "active_cart") {
      const rows = await this.db.cart.findMany({ where: { customer: base, items: { some: {} } }, select: { customerId: true } });
      return rows.flatMap((row) => (row.customerId ? [row.customerId] : []));
    }
    if (query.segment === "inactive") {
      const cutoff = cutoffDays(query.inactiveDays ?? 30);
      const rows = await this.db.user.findMany({ where: { ...base, OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null, createdAt: { lt: cutoff } }] }, select: { id: true } });
      return rows.map((row) => row.id);
    }
    if (query.segment === "recently_registered") {
      const rows = await this.db.user.findMany({ where: { ...base, createdAt: { gte: cutoffDays(query.registeredDays ?? 7) } }, select: { id: true } });
      return rows.map((row) => row.id);
    }
    const rows = await this.db.user.findMany({ where: base, select: { id: true } });
    return rows.map((row) => row.id);
  }

  private async getFilteredIds(query: CustomerSegmentQuery) {
    const candidateIds = await this.resolveSegmentIds(query);
    if (candidateIds.length === 0) return { ids: [] as string[], profiles: new Map<string, { createdAt: Date; lastLoginAt: Date | null }>(), metrics: new Map<string, OrderMetric>() };
    const where: Prisma.UserWhereInput = {
      type: "CUSTOMER",
      id: { in: candidateIds },
      ...searchWhere(query.search),
      ...(query.consent === "OPTED_IN" ? { marketingConsent: true } : {}),
      ...(query.consent === "NOT_OPTED_IN" ? { marketingConsent: false } : {}),
      ...(query.registeredDays ? { createdAt: { gte: cutoffDays(query.registeredDays) } } : {}),
      ...(query.lastLoginDays ? { lastLoginAt: { lt: cutoffDays(query.lastLoginDays) } } : {}),
    };
    const records = await this.db.user.findMany({ where, select: { id: true, createdAt: true, lastLoginAt: true } });
    const ids = records.map((record) => record.id);
    const metrics = await this.orderMetrics(ids);
    const minSpend = query.minSpend ? decimal(query.minSpend) : null;
    const maxSpend = query.maxSpend ? decimal(query.maxSpend) : null;
    const filtered = ids.filter((id) => {
      const metric = metrics.get(id) ?? { orderCount: 0, paidOrderCount: 0, totalSpent: new Prisma.Decimal(0) };
      return (!minSpend || metric.totalSpent.gte(minSpend)) && (!maxSpend || metric.totalSpent.lte(maxSpend)) && (!query.minOrders || metric.orderCount >= query.minOrders) && (!query.maxOrders || metric.orderCount <= query.maxOrders);
    });
    return { ids: filtered, profiles: new Map(records.map((record) => [record.id, record])), metrics };
  }

  private sortIds(ids: string[], query: CustomerSegmentQuery, profiles: Map<string, { createdAt: Date; lastLoginAt: Date | null }>, metrics: Map<string, OrderMetric>) {
    const sort = query.sort ?? "newest";
    return [...ids].sort((left, right) => {
      const leftMetric = metrics.get(left) ?? { orderCount: 0, paidOrderCount: 0, totalSpent: new Prisma.Decimal(0) };
      const rightMetric = metrics.get(right) ?? { orderCount: 0, paidOrderCount: 0, totalSpent: new Prisma.Decimal(0) };
      if (sort === "highest_spent") return rightMetric.totalSpent.comparedTo(leftMetric.totalSpent);
      if (sort === "lowest_spent") return leftMetric.totalSpent.comparedTo(rightMetric.totalSpent);
      if (sort === "most_orders") return rightMetric.orderCount - leftMetric.orderCount;
      if (sort === "recent_login") return (profiles.get(right)?.lastLoginAt?.getTime() ?? 0) - (profiles.get(left)?.lastLoginAt?.getTime() ?? 0);
      const leftDate = profiles.get(left)?.createdAt.getTime() ?? 0;
      const rightDate = profiles.get(right)?.createdAt.getTime() ?? 0;
      return sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
    });
  }

  private async pageRows(ids: string[], metrics: Map<string, OrderMetric>, page: number, currentPageSize: number): Promise<CustomerSegmentRow[]> {
    const pageIds = ids.slice((page - 1) * currentPageSize, page * currentPageSize);
    if (pageIds.length === 0) return [];
    const [profiles, carts, favorites] = await Promise.all([
      this.db.user.findMany({ where: { id: { in: pageIds }, type: "CUSTOMER" }, select: profileSelect }),
      this.db.cart.findMany({ where: { customerId: { in: pageIds } }, include: { items: { select: { quantity: true, unitPrice: true } } } }),
      this.db.favorite.groupBy({ by: ["userId"], where: { userId: { in: pageIds } }, _count: { _all: true } }),
    ]);
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const cartMap = new Map(carts.map((cart) => [cart.customerId, { itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0), value: cart.items.reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantity)), new Prisma.Decimal(0)) }]));
    const favoritesMap = new Map(favorites.map((row) => [row.userId, row._count._all]));
    return pageIds.flatMap((id) => {
      const profile = profileMap.get(id);
      if (!profile) return [];
      const metric = metrics.get(id) ?? { orderCount: 0, paidOrderCount: 0, totalSpent: new Prisma.Decimal(0) };
      const cart = cartMap.get(id);
      return [{ ...baseProfile(profile), orderCount: metric.orderCount, paidOrderCount: metric.paidOrderCount, totalSpent: money(metric.totalSpent), lastOrderAt: null, cartItemCount: cart?.itemCount ?? 0, cartValue: money(cart?.value), favoritesCount: favoritesMap.get(id) ?? 0 }];
    });
  }

  private async summary(ids: string[], metrics: Map<string, OrderMetric>): Promise<CustomerSegmentSummary> {
    const totalSpend = ids.reduce((sum, id) => sum.add(metrics.get(id)?.totalSpent ?? 0), new Prisma.Decimal(0));
    const optedIn = ids.length === 0 ? 0 : await this.db.user.count({ where: { id: { in: ids }, type: "CUSTOMER", marketingConsent: true } });
    return { totalCustomers: ids.length, totalSpend: money(totalSpend), optedIn, averageCustomerSpend: ids.length === 0 ? "0.00" : money(totalSpend.div(ids.length)) };
  }

  async getCounts(query: CustomerSegmentQuery) {
    return Promise.all(customerSegmentDefinitions.map(async (definition) => {
      const ids = await this.resolveSegmentIds({ ...query, segment: definition.key });
      return { ...definition, count: ids.length };
    }));
  }

  async findAudience(query: CustomerSegmentQuery): Promise<Omit<CustomerSegmentPage, "definitions" | "canExport">> {
    const currentPage = Math.max(1, query.page ?? 1);
    const currentPageSize = Math.min(50, Math.max(1, query.pageSize ?? pageSize));
    const filtered = await this.getFilteredIds(query);
    const ids = this.sortIds(filtered.ids, query, filtered.profiles, filtered.metrics);
    const definition = getCustomerSegmentDefinition(query.segment);
    return { definition, items: await this.pageRows(ids, filtered.metrics, currentPage, currentPageSize), page: currentPage, pageSize: currentPageSize, total: ids.length, totalPages: Math.max(1, Math.ceil(ids.length / currentPageSize)), summary: await this.summary(ids, filtered.metrics) };
  }

  async buildExportRows(query: CustomerSegmentQuery) {
    const filtered = await this.getFilteredIds({ ...query, page: 1, pageSize: 50 });
    const ids = this.sortIds(filtered.ids, query, filtered.profiles, filtered.metrics);
    return this.pageRows(ids, filtered.metrics, 1, Math.max(ids.length, 1));
  }
}
