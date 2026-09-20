import "server-only";

import { Prisma, PrismaClient, type CouponType, type Market } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { getCouponStatus } from "../domain/status";
import type { Coupon, CouponDetail, CouponQuery, CouponRedemption, CreateCouponInput, UpdateCouponInput } from "../types";

type Db = PrismaClient | Prisma.TransactionClient;
type CouponListRecord = { id: string; name: string; code: string; type: CouponType; percentageDiscount: Prisma.Decimal | null; fixedDiscountAmount: Prisma.Decimal | null; minimumOrderSubtotal: Prisma.Decimal; maximumDiscountAmount: Prisma.Decimal | null; marketRules: { market: Market; fixedDiscountAmount: Prisma.Decimal | null; minimumOrderSubtotal: Prisma.Decimal; maximumDiscountAmount: Prisma.Decimal | null }[]; isActive: boolean; startsAt: Date; endsAt: Date | null; totalUsageLimit: number | null; perCustomerUsageLimit: number | null; canCombineWithPromotions: boolean; createdAt: Date; updatedAt: Date; _count?: { redemptions: number }; uniqueCustomerCount?: number; discountGiven?: Prisma.Decimal | null; redeemedCount?: number };
type CouponRedemptionRecord = Prisma.CouponRedemptionGetPayload<{ include: { customer: { select: { name: true; email: true } }; order: { select: { orderNumber: true; subtotal: true; total: true } } } }>;

function money(value: Prisma.Decimal | null | undefined) { return value?.toFixed(2) ?? null; }

function toCoupon(record: CouponListRecord, now = new Date()): Coupon {
  const redeemedCount = record._count?.redemptions ?? record.redeemedCount ?? 0;
  return {
    id: record.id, name: record.name, code: record.code, type: record.type,
    percentageDiscount: money(record.percentageDiscount), fixedDiscountAmount: money(record.fixedDiscountAmount),
    minimumOrderSubtotal: record.minimumOrderSubtotal.toFixed(2), maximumDiscountAmount: money(record.maximumDiscountAmount),
    marketRules: Object.fromEntries(record.marketRules.map((rule) => [rule.market, { fixedDiscountAmount: money(rule.fixedDiscountAmount), minimumOrderSubtotal: rule.minimumOrderSubtotal.toFixed(2), maximumDiscountAmount: money(rule.maximumDiscountAmount) }])) as Coupon["marketRules"],
    isActive: record.isActive, startsAt: record.startsAt.toISOString(), endsAt: record.endsAt?.toISOString() ?? null,
    totalUsageLimit: record.totalUsageLimit, perCustomerUsageLimit: record.perCustomerUsageLimit,
    canCombineWithPromotions: record.canCombineWithPromotions, status: getCouponStatus(record, redeemedCount, now),
    redeemedCount, uniqueCustomerCount: record.uniqueCustomerCount, discountGiven: money(record.discountGiven) ?? undefined,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  };
}

function toRedemption(record: CouponRedemptionRecord): CouponRedemption {
  return { id: record.id, customerId: record.customerId, customerName: record.customer.name, customerEmail: record.customer.email, orderId: record.orderId, orderNumber: record.order.orderNumber, orderSubtotal: record.order.subtotal.toFixed(2), orderTotal: record.order.total.toFixed(2), discountAmount: record.discountAmount.toFixed(2), status: record.status, redeemedAt: record.redeemedAt.toISOString(), reversedAt: record.reversedAt?.toISOString() ?? null };
}

export type CouponPricingRecord = {
  id: string; name: string; code: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; percentageDiscount: Prisma.Decimal | null; fixedDiscountAmount: Prisma.Decimal | null; minimumOrderSubtotal: Prisma.Decimal; maximumDiscountAmount: Prisma.Decimal | null; isActive: boolean; startsAt: Date; endsAt: Date | null; totalUsageLimit: number | null; perCustomerUsageLimit: number | null; canCombineWithPromotions: boolean; totalRedeemed: number; customerRedeemed?: number;
};

export async function findCouponForPricing(db: Db, couponId: string, market: Market, customerId?: string): Promise<CouponPricingRecord | null> {
  const coupon = await db.coupon.findUnique({ where: { id: couponId }, include: { marketRules: { where: { market } } } });
  if (!coupon) return null;
  const rule = coupon.marketRules[0];
  if (!rule) return null;
  const [totalRedeemed, customerRedeemed] = await Promise.all([
    db.couponRedemption.count({ where: { couponId, status: "REDEEMED" } }),
    customerId ? db.couponRedemption.count({ where: { couponId, customerId, status: "REDEEMED" } }) : Promise.resolve(undefined),
  ]);
  return { ...coupon, fixedDiscountAmount: rule.fixedDiscountAmount, minimumOrderSubtotal: rule.minimumOrderSubtotal, maximumDiscountAmount: rule.maximumDiscountAmount, totalRedeemed, customerRedeemed };
}

export interface CouponRepository {
  findAll(query: CouponQuery): Promise<{ items: Coupon[]; total: number }>;
  findById(id: string): Promise<CouponDetail | null>;
  findByCode(code: string, customerId?: string): Promise<CouponPricingRecord | null>;
  create(input: CreateCouponInput & { code: string }): Promise<Coupon>;
  update(input: UpdateCouponInput & { code?: string }): Promise<Coupon>;
  delete(id: string): Promise<void>;
  countRedemptions(id: string): Promise<number>;
}

export class PrismaCouponRepository implements CouponRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findAll(query: CouponQuery = {}) {
    const search = query.search?.trim();
    const where: Prisma.CouponWhereInput = { ...(query.type && query.type !== "ALL" ? { type: query.type } : {}), ...(search ? { OR: [{ code: { contains: search.toUpperCase() } }, { name: { contains: search, mode: "insensitive" } }] } : {}) };
    const records = await this.db.coupon.findMany({ where, include: { marketRules: true, _count: { select: { redemptions: { where: { status: "REDEEMED" } } } } }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
    const items = records.map((record) => toCoupon(record));
    const filtered = query.status && query.status !== "ALL" ? items.filter((item) => item.status === query.status) : items;
    return { items: filtered, total: filtered.length };
  }

  async findById(id: string) {
    const record = await this.db.coupon.findUnique({ where: { id }, include: { marketRules: true, _count: { select: { redemptions: { where: { status: "REDEEMED" } } } }, redemptions: { include: { customer: { select: { name: true, email: true } }, order: { select: { orderNumber: true, subtotal: true, total: true } } }, orderBy: { redeemedAt: "desc" } } } });
    if (!record) return null;
    const active = record.redemptions.filter((item) => item.status === "REDEEMED");
    const coupon = toCoupon({ ...record, uniqueCustomerCount: new Set(active.map((item) => item.customerId)).size, discountGiven: active.reduce((sum, item) => sum.add(item.discountAmount), new Prisma.Decimal(0)) });
    const gross = active.reduce((sum, item) => sum.add(item.order.subtotal), new Prisma.Decimal(0));
    return { ...coupon, redemptions: record.redemptions.map(toRedemption), grossMerchandiseValue: gross.toFixed(2), netMerchandiseValue: gross.sub(active.reduce((sum, item) => sum.add(item.discountAmount), new Prisma.Decimal(0))).toFixed(2), remainingUses: record.totalUsageLimit == null ? null : Math.max(0, record.totalUsageLimit - active.length) } satisfies CouponDetail;
  }

  async findByCode(code: string, customerId?: string) { const normalized = code.trim().toUpperCase(); const coupon = await this.db.coupon.findUnique({ where: { code: normalized } }); return coupon ? findCouponForPricing(this.db, coupon.id, "SAUDI_ARABIA", customerId) : null; }

  async create(input: CreateCouponInput & { code: string }) {
    const record = await this.db.coupon.create({ data: { name: input.name, code: input.code, type: input.type, percentageDiscount: input.percentageDiscount == null ? null : new Prisma.Decimal(input.percentageDiscount), fixedDiscountAmount: null, minimumOrderSubtotal: new Prisma.Decimal(0), maximumDiscountAmount: null, marketRules: { create: (["SAUDI_ARABIA", "EGYPT"] as const).map((market) => ({ market, fixedDiscountAmount: input.marketRules[market].fixedDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules[market].fixedDiscountAmount!), minimumOrderSubtotal: new Prisma.Decimal(input.marketRules[market].minimumOrderSubtotal ?? 0), maximumDiscountAmount: input.marketRules[market].maximumDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules[market].maximumDiscountAmount!) })) }, isActive: input.isActive, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, totalUsageLimit: input.totalUsageLimit ?? null, perCustomerUsageLimit: input.perCustomerUsageLimit ?? null, canCombineWithPromotions: input.canCombineWithPromotions }, include: { marketRules: true } });
    return toCoupon(record);
  }

  async update(input: UpdateCouponInput & { code?: string }) {
    const data: Prisma.CouponUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (input.type !== undefined) data.type = input.type;
    if (input.percentageDiscount !== undefined) data.percentageDiscount = input.percentageDiscount == null ? null : new Prisma.Decimal(input.percentageDiscount);
    if (input.marketRules !== undefined) data.marketRules = { upsert: (["SAUDI_ARABIA", "EGYPT"] as const).map((market) => ({ where: { couponId_market: { couponId: input.id, market } }, create: { market, fixedDiscountAmount: input.marketRules![market].fixedDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules![market].fixedDiscountAmount!), minimumOrderSubtotal: new Prisma.Decimal(input.marketRules![market].minimumOrderSubtotal ?? 0), maximumDiscountAmount: input.marketRules![market].maximumDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules![market].maximumDiscountAmount!) }, update: { fixedDiscountAmount: input.marketRules![market].fixedDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules![market].fixedDiscountAmount!), minimumOrderSubtotal: new Prisma.Decimal(input.marketRules![market].minimumOrderSubtotal ?? 0), maximumDiscountAmount: input.marketRules![market].maximumDiscountAmount == null ? null : new Prisma.Decimal(input.marketRules![market].maximumDiscountAmount!) } })) };
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.totalUsageLimit !== undefined) data.totalUsageLimit = input.totalUsageLimit;
    if (input.perCustomerUsageLimit !== undefined) data.perCustomerUsageLimit = input.perCustomerUsageLimit;
    if (input.canCombineWithPromotions !== undefined) data.canCombineWithPromotions = input.canCombineWithPromotions;
    return toCoupon(await this.db.coupon.update({ where: { id: input.id }, data, include: { marketRules: true } }));
  }

  async delete(id: string) { await this.db.coupon.delete({ where: { id } }); }
  async countRedemptions(id: string) { return this.db.couponRedemption.count({ where: { couponId: id } }); }
}
