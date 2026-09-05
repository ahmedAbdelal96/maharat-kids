import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import type { UserId } from "@/modules/identity/types";

import type { CustomerAddress } from "../types";
import type {
  AdminCustomer360,
  AdminCustomerListPage,
  Customer360Cart,
  Customer360Favorite,
  Customer360Order,
  CustomerActivityEvent,
  CustomerListQuery,
  CustomerListItem,
  CustomerValueMetrics,
} from "./types";

const pageSize = 20;
const orderPageSize = 12;
export const qualifyingPaidOrderWhere = { paymentStatus: "PAID" as const, status: { not: "CANCELLED" as const } };

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  type: true,
  status: true,
  firstLoginAt: true,
  lastLoginAt: true,
  loginCount: true,
  marketingConsent: true,
  marketingConsentAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { addresses: true } },
} as const;

export type ProfileRecord = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export function money(value: Prisma.Decimal | number | string | null | undefined): string {
  return value === null || value === undefined ? "0.00" : new Prisma.Decimal(value).toFixed(2);
}

function toAddress(record: {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  country: string;
  governorate: string | null;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CustomerAddress {
  return { ...record, userId: record.userId as UserId };
}

export function baseProfile(record: ProfileRecord) {
  return {
    id: record.id as UserId,
    name: record.name,
    email: record.email,
    phone: record.phone,
    status: record.status,
    firstLoginAt: record.firstLoginAt,
    lastLoginAt: record.lastLoginAt,
    loginCount: record.loginCount,
    marketingConsent: record.marketingConsent,
    marketingConsentAt: record.marketingConsentAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    addressCount: record._count.addresses,
  };
}

type OrderAggregate = { customerId: string; _count: { _all: number }; _sum: { total: Prisma.Decimal | null } };

export interface CustomerIntelligenceRepository {
  findCustomerList(input: CustomerListQuery): Promise<AdminCustomerListPage>;
  findCustomer360(customerId: UserId, orderPage: number): Promise<AdminCustomer360 | null>;
}

export class PrismaCustomerIntelligenceRepository implements CustomerIntelligenceRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findCustomerList(input: CustomerListQuery): Promise<AdminCustomerListPage> {
    const currentPage = Math.max(1, input.page ?? 1);
    const currentPageSize = Math.min(50, Math.max(1, input.pageSize ?? pageSize));
    const term = input.search?.trim();
    const orderFilters: Prisma.OrderListRelationFilter = {};
    if (input.purchase === "HAS_ORDERS") orderFilters.some = {};
    if (input.purchase === "NO_ORDERS") orderFilters.none = {};
    if (input.value === "HAS_SPENT") orderFilters.some = qualifyingPaidOrderWhere;
    if (input.value === "NEVER_PURCHASED") orderFilters.none = qualifyingPaidOrderWhere;

    const where: Prisma.UserWhereInput = {
      type: "CUSTOMER",
      ...(term ? { OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ] } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(Object.keys(orderFilters).length > 0 ? { orders: orderFilters } : {}),
      ...(input.marketing === "OPTED_IN" ? { marketingConsent: true } : {}),
      ...(input.marketing === "NOT_OPTED_IN" ? { marketingConsent: false } : {}),
    };

    const [total, records] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        select: profileSelect,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * currentPageSize,
        take: currentPageSize,
      }),
    ]);

    const ids = records.map((record) => record.id);
    const [orders, paidOrders, lastOrders] = ids.length === 0
      ? [[], [], []] as const
      : await Promise.all([
        this.db.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _count: { _all: true }, _sum: { total: true } }),
        this.db.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids, }, ...qualifyingPaidOrderWhere }, _count: { _all: true }, _sum: { total: true } }),
        this.db.order.findMany({ where: { customerId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["customerId"], select: { customerId: true, createdAt: true } }),
      ]);

    const orderMap = new Map((orders as OrderAggregate[]).map((row) => [row.customerId, row]));
    const paidMap = new Map((paidOrders as OrderAggregate[]).map((row) => [row.customerId, row]));
    const lastMap = new Map((lastOrders as { customerId: string; createdAt: Date }[]).map((row) => [row.customerId, row.createdAt]));

    return {
      items: records.map((record) => {
        const all = orderMap.get(record.id);
        const paid = paidMap.get(record.id);
        const item: CustomerListItem = {
          ...baseProfile(record),
          orderCount: all?._count._all ?? 0,
          paidOrderCount: paid?._count._all ?? 0,
          totalSpent: money(paid?._sum.total),
          lastOrderAt: lastMap.get(record.id) ?? null,
        };
        return item;
      }),
      page: currentPage,
      pageSize: currentPageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / currentPageSize)),
    };
  }

  async findCustomer360(customerId: UserId, orderPage: number): Promise<AdminCustomer360 | null> {
    const profile = await this.db.user.findFirst({ where: { id: customerId, type: "CUSTOMER" }, select: profileSelect });
    if (!profile) return null;

    const currentOrderPage = Math.max(1, orderPage);
    const [totalOrders, paidOrders, cancelledOrders, paidSum, lastOrder, addresses, orderRows, favorites, cart, orderEvents, statusEvents, paymentEvents, notifications] = await Promise.all([
      this.db.order.count({ where: { customerId } }),
      this.db.order.count({ where: { customerId, ...qualifyingPaidOrderWhere } }),
      this.db.order.count({ where: { customerId, status: "CANCELLED" } }),
      this.db.order.aggregate({ where: { customerId, ...qualifyingPaidOrderWhere }, _sum: { total: true } }),
      this.db.order.findFirst({ where: { customerId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      this.db.customerAddress.findMany({ where: { userId: customerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      this.db.order.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, skip: (currentOrderPage - 1) * orderPageSize, take: orderPageSize, select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, currency: true, createdAt: true } }),
      this.db.favorite.findMany({ where: { userId: customerId }, orderBy: { createdAt: "desc" }, include: { product: { select: { id: true, name: true, price: true, status: true, trackInventory: true, stockQuantity: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true, media: { select: { url: true } } } } } } } }),
      this.db.cart.findUnique({ where: { customerId }, include: { items: { orderBy: { createdAt: "asc" } } } }),
      this.db.order.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, orderNumber: true, createdAt: true } }),
      this.db.orderStatusHistory.findMany({ where: { order: { customerId } }, orderBy: { createdAt: "desc" }, take: 80, select: { id: true, orderId: true, oldStatus: true, newStatus: true, note: true, createdAt: true, order: { select: { orderNumber: true } } } }),
      this.db.paymentStatusHistory.findMany({ where: { order: { customerId } }, orderBy: { createdAt: "desc" }, take: 80, select: { id: true, orderId: true, oldStatus: true, newStatus: true, note: true, createdAt: true, order: { select: { orderNumber: true } } } }),
      this.db.notification.findMany({ where: { userId: customerId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, message: true, createdAt: true, href: true } }),
    ]);

    const productIds = cart?.items.map((item) => item.productId) ?? [];
    const cartProducts = productIds.length === 0 ? [] : await this.db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, price: true, status: true, trackInventory: true, stockQuantity: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true, media: { select: { url: true } } } } } });
    const productMap = new Map(cartProducts.map((product) => [product.id, product]));

    const cartItems = cart?.items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product?.price ?? item.unitPrice;
      const isAvailable = product ? product.status === "ACTIVE" && (!product.trackInventory || product.stockQuantity >= item.quantity) : false;
      return { id: item.id, productId: item.productId, name: product?.name ?? item.name, imageUrl: product?.images[0]?.media?.url ?? product?.images[0]?.url ?? item.imageUrl, quantity: item.quantity, unitPrice: money(unitPrice), lineTotal: money(new Prisma.Decimal(unitPrice).mul(item.quantity)), isAvailable };
    }) ?? [];
    const customerCart: Customer360Cart = { items: cartItems, total: money(cartItems.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0))) };

    const customerFavorites: Customer360Favorite[] = favorites.map((favorite) => {
      const product = favorite.product;
      const available = product.status === "ACTIVE" && (!product.trackInventory || product.stockQuantity > 0);
      return { id: favorite.id, productId: product.id, name: product.name, imageUrl: product.images[0]?.media?.url ?? product.images[0]?.url ?? null, price: money(product.price), status: product.status, isAvailable: available, createdAt: favorite.createdAt };
    });

    const totalSpent = money(paidSum._sum.total);
    const paidCount = paidOrders;
    const metrics: CustomerValueMetrics = { totalOrders, paidOrders, cancelledOrders, totalSpent, averageOrderValue: paidCount === 0 ? "0.00" : new Prisma.Decimal(totalSpent).div(paidCount).toFixed(2), lastOrderAt: lastOrder?.createdAt ?? null };
    const orderList: Customer360Order[] = orderRows.map((order) => ({ ...order, total: money(order.total) }));
    const activity: CustomerActivityEvent[] = [
      { id: `registered-${profile.id}`, type: "REGISTERED" as const, title: "Account registered", description: "Customer account created.", createdAt: profile.createdAt },
      ...(profile.firstLoginAt ? [{ id: `first-login-${profile.id}`, type: "LOGIN" as const, title: "First successful login", description: "The customer completed their first authentication.", createdAt: profile.firstLoginAt }] : []),
      ...(profile.lastLoginAt && profile.lastLoginAt.getTime() !== profile.firstLoginAt?.getTime() ? [{ id: `last-login-${profile.id}`, type: "LOGIN" as const, title: "Successful login", description: `Successful login number ${profile.loginCount}.`, createdAt: profile.lastLoginAt }] : []),
      ...orderEvents.map((event) => ({ id: `order-${event.id}`, type: "ORDER" as const, title: "Order created", description: event.orderNumber, createdAt: event.createdAt, href: `/admin/orders?order=${event.id}` })),
      ...statusEvents.map((event) => ({ id: `status-${event.id}`, type: "STATUS" as const, title: `Order ${event.newStatus.toLowerCase().replaceAll("_", " ")}`, description: `${event.order.orderNumber}${event.note ? ` · ${event.note}` : ""}`, createdAt: event.createdAt, href: `/admin/orders?order=${event.orderId}` })),
      ...paymentEvents.map((event) => ({ id: `payment-${event.id}`, type: "PAYMENT" as const, title: `Payment ${event.newStatus.toLowerCase().replaceAll("_", " ")}`, description: `${event.order.orderNumber}${event.note ? ` · ${event.note}` : ""}`, createdAt: event.createdAt, href: `/admin/orders?order=${event.orderId}` })),
      ...customerFavorites.map((favorite) => ({ id: `favorite-${favorite.id}`, type: "FAVORITE" as const, title: "Product saved to Favorites", description: favorite.name, createdAt: favorite.createdAt })),
      ...notifications.map((notification) => ({ id: `notification-${notification.id}`, type: "NOTIFICATION" as const, title: notification.title, description: notification.message, createdAt: notification.createdAt, href: notification.href ?? undefined })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 120);

    const allOrderCount = totalOrders;
    const listProfile = { ...baseProfile(profile), orderCount: allOrderCount, paidOrderCount: paidOrders, totalSpent, lastOrderAt: lastOrder?.createdAt ?? null };
    return { profile: listProfile, addresses: addresses.map(toAddress), metrics, orders: orderList, ordersPage: currentOrderPage, ordersTotalPages: Math.max(1, Math.ceil(totalOrders / orderPageSize)), cart: customerCart, favorites: customerFavorites, activity, canUpdate: false };
  }
}
