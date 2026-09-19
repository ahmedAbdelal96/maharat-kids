import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { getPrismaClient } from "@/database/prisma";
import type {
  CreatePromotionInput,
  Promotion,
  PromotionProductRef,
  PromotionQuery,
  PromotionSummary,
} from "../types";
import { getPromotionStatus, isPromotionCurrentlyActive } from "../domain/status";

const promotionInclude = {
  bannerMedia: {
    select: { id: true, url: true },
  },
  qualifyingProduct: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      status: true,
      trackInventory: true,
      stockQuantity: true,
      images: {
        where: { isPrimary: true },
        select: { url: true },
        take: 1,
      },
    },
  },
  giftProduct: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      status: true,
      trackInventory: true,
      stockQuantity: true,
      images: {
        where: { isPrimary: true },
        select: { url: true },
        take: 1,
      },
    },
  },
  _count: {
    select: {
      orderPromotions: true,
    },
  },
  translations: {
    select: { locale: true, name: true, shortDescription: true, description: true },
  },
} as const;

type PromotionRecord = Prisma.PromotionGetPayload<{ include: typeof promotionInclude }>;

function money(val: Prisma.Decimal | null | undefined): string | null {
  return val ? val.toFixed(2) : null;
}

function toProductRef(prod: PromotionRecord["qualifyingProduct"] | PromotionRecord["giftProduct"]): PromotionProductRef | null {
  if (!prod) return null;
  return {
    id: prod.id,
    name: prod.name,
    slug: prod.slug,
    price: prod.price.toFixed(2),
    compareAtPrice: money(prod.compareAtPrice),
    imageUrl: prod.images[0]?.url ?? null,
    stockQuantity: prod.stockQuantity,
    trackInventory: prod.trackInventory,
    status: prod.status,
  };
}

async function requestLocale(): Promise<"ar" | "en"> { try { return (await getLocale()) === "en" ? "en" : "ar"; } catch { return "ar"; } }

function toPromotion(record: PromotionRecord, now = new Date(), locale: "ar" | "en" = "ar"): Promotion {
  const translation = record.translations?.find((item) => item.locale === locale) ?? record.translations?.find((item) => item.locale === "ar");
  return {
    id: record.id,
    name: translation?.name ?? record.name,
    slug: record.slug,
    shortDescription: translation?.shortDescription ?? record.shortDescription,
    description: translation?.description ?? record.description,
    type: record.type,
    isActive: record.isActive,
    showInHero: record.showInHero,
    showOnOffersPage: record.showOnOffersPage,
    bannerMediaId: record.bannerMediaId,
    bannerUrl: record.bannerMedia?.url ?? null,
    priority: record.priority,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt ? record.endsAt.toISOString() : null,
    status: getPromotionStatus(record, now),

    minimumOrderSubtotal: money(record.minimumOrderSubtotal),
    percentageDiscount: record.percentageDiscount ? record.percentageDiscount.toFixed(2) : null,
    fixedDiscountAmount: money(record.fixedDiscountAmount),
    qualifyingProductId: record.qualifyingProductId,
    qualifyingProduct: toProductRef(record.qualifyingProduct),
    buyQuantity: record.buyQuantity,
    giftProductId: record.giftProductId,
    giftProduct: toProductRef(record.giftProduct),
    giftQuantity: record.giftQuantity,

    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    orderCount: record._count.orderPromotions,
  };
}

function toSummary(record: PromotionRecord, now = new Date(), locale: "ar" | "en" = "ar"): PromotionSummary {
  const translation = record.translations?.find((item) => item.locale === locale) ?? record.translations?.find((item) => item.locale === "ar");
  return {
    id: record.id,
    name: translation?.name ?? record.name,
    slug: record.slug,
    shortDescription: translation?.shortDescription ?? record.shortDescription,
    type: record.type,
    isActive: record.isActive,
    showInHero: record.showInHero,
    showOnOffersPage: record.showOnOffersPage,
    bannerUrl: record.bannerMedia?.url ?? null,
    priority: record.priority,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt ? record.endsAt.toISOString() : null,
    status: getPromotionStatus(record, now),
    percentageDiscount: record.percentageDiscount ? record.percentageDiscount.toFixed(2) : null,
    fixedDiscountAmount: money(record.fixedDiscountAmount),
    minimumOrderSubtotal: money(record.minimumOrderSubtotal),
    buyQuantity: record.buyQuantity,
    giftQuantity: record.giftQuantity,
    qualifyingProductName: record.qualifyingProduct?.name ?? null,
    giftProductName: record.giftProduct?.name ?? null,
    orderCount: record._count.orderPromotions,
    createdAt: record.createdAt.toISOString(),
  };
}

export interface PromotionRepository {
  findAll(query?: PromotionQuery, now?: Date): Promise<{ items: PromotionSummary[]; total: number }>;
  findById(id: string, now?: Date): Promise<Promotion | null>;
  findBySlug(slug: string, activeOnly?: boolean, now?: Date): Promise<Promotion | null>;
  findEligibleHeroPromotions(limit: number, now?: Date): Promise<Promotion[]>;
  findEligiblePublicOffers(now?: Date): Promise<Promotion[]>;
  findParticipatingPromotionForProduct(productId: string, now?: Date): Promise<Promotion | null>;
  create(input: CreatePromotionInput & { slug: string }): Promise<Promotion>;
  update(id: string, input: Partial<CreatePromotionInput>): Promise<Promotion>;
  delete(id: string): Promise<void>;
  countOrdersUsingPromotion(promotionId: string): Promise<number>;
  countActivePromotions(excludeId?: string): Promise<number>;
  countHeroPromotions(excludeId?: string): Promise<number>;
  slugExists(slug: string, excludeId?: string): Promise<boolean>;
}

export class PrismaPromotionRepository implements PromotionRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findAll(query: PromotionQuery = {}, now = new Date()): Promise<{ items: PromotionSummary[]; total: number }> {
    const locale = await requestLocale();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const search = query.search?.trim();

    const where: Prisma.PromotionWhereInput = {
      ...(query.heroOnly ? { showInHero: true } : {}),
      ...(query.offersPageOnly ? { showOnOffersPage: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { shortDescription: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (query.status && query.status !== "ALL") {
      if (query.status === "INACTIVE") {
        where.isActive = false;
      } else if (query.status === "SCHEDULED") {
        where.isActive = true;
        where.startsAt = { gt: now };
      } else if (query.status === "ACTIVE") {
        where.isActive = true;
        where.startsAt = { lte: now };
        where.OR = [{ endsAt: null }, { endsAt: { gt: now } }];
      } else if (query.status === "EXPIRED") {
        where.endsAt = { lte: now };
      }
    }

    const [total, records] = await Promise.all([
      this.db.promotion.count({ where }),
      this.db.promotion.findMany({
        where,
        include: promotionInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map((r) => toSummary(r, now, locale)),
      total,
    };
  }

  async findById(id: string, now = new Date()): Promise<Promotion | null> {
    const locale = await requestLocale();
    const record = await this.db.promotion.findUnique({
      where: { id },
      include: promotionInclude,
    });
    return record ? toPromotion(record, now, locale) : null;
  }

  async findBySlug(slug: string, activeOnly = false, now = new Date()): Promise<Promotion | null> {
    const locale = await requestLocale();
    const record = await this.db.promotion.findUnique({
      where: { slug },
      include: promotionInclude,
    });
    if (!record) return null;
    if (activeOnly && !isPromotionCurrentlyActive(record, now)) return null;
    return toPromotion(record, now, locale);
  }

  async findEligibleHeroPromotions(limit: number, now = new Date()): Promise<Promotion[]> {
    const locale = await requestLocale();
    const records = await this.db.promotion.findMany({
      where: {
        isActive: true,
        showInHero: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: promotionInclude,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: limit,
    });
    return records.map((r) => toPromotion(r, now, locale));
  }

  async findEligiblePublicOffers(now = new Date()): Promise<Promotion[]> {
    const locale = await requestLocale();
    const records = await this.db.promotion.findMany({
      where: {
        isActive: true,
        showOnOffersPage: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: promotionInclude,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    return records.map((r) => toPromotion(r, now, locale));
  }

  async findParticipatingPromotionForProduct(productId: string, now = new Date()): Promise<Promotion | null> {
    const locale = await requestLocale();
    const record = await this.db.promotion.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        AND: [
          {
            OR: [
              { qualifyingProductId: productId },
              { giftProductId: productId },
            ],
          },
        ],
      },
      include: promotionInclude,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    return record ? toPromotion(record, now, locale) : null;
  }

  async create(input: CreatePromotionInput & { slug: string }): Promise<Promotion> {
    const record = await this.db.promotion.create({
      data: {
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        description: input.description ?? null,
        type: input.type,
        isActive: input.isActive,
        showInHero: input.showInHero,
        showOnOffersPage: input.showOnOffersPage,
        bannerMediaId: input.bannerMediaId ?? null,
        priority: input.priority,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        minimumOrderSubtotal: input.minimumOrderSubtotal != null ? new Prisma.Decimal(input.minimumOrderSubtotal) : null,
        percentageDiscount: input.percentageDiscount != null ? new Prisma.Decimal(input.percentageDiscount) : null,
        fixedDiscountAmount: input.fixedDiscountAmount != null ? new Prisma.Decimal(input.fixedDiscountAmount) : null,
        qualifyingProductId: input.qualifyingProductId ?? null,
        buyQuantity: input.buyQuantity ?? null,
        giftProductId: input.giftProductId ?? null,
        giftQuantity: input.giftQuantity ?? null,
      },
      include: promotionInclude,
    });
    return toPromotion(record);
  }

  async update(id: string, input: Partial<CreatePromotionInput>): Promise<Promotion> {
    const data: Prisma.PromotionUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.showInHero !== undefined ? { showInHero: input.showInHero } : {}),
      ...(input.showOnOffersPage !== undefined ? { showOnOffersPage: input.showOnOffersPage } : {}),
      ...(input.bannerMediaId !== undefined ? { bannerMediaId: input.bannerMediaId ?? null } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.startsAt !== undefined ? { startsAt: new Date(input.startsAt) } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
      ...(input.minimumOrderSubtotal !== undefined
        ? { minimumOrderSubtotal: input.minimumOrderSubtotal != null ? new Prisma.Decimal(input.minimumOrderSubtotal) : null }
        : {}),
      ...(input.percentageDiscount !== undefined
        ? { percentageDiscount: input.percentageDiscount != null ? new Prisma.Decimal(input.percentageDiscount) : null }
        : {}),
      ...(input.fixedDiscountAmount !== undefined
        ? { fixedDiscountAmount: input.fixedDiscountAmount != null ? new Prisma.Decimal(input.fixedDiscountAmount) : null }
        : {}),
      ...(input.qualifyingProductId !== undefined ? { qualifyingProductId: input.qualifyingProductId ?? null } : {}),
      ...(input.buyQuantity !== undefined ? { buyQuantity: input.buyQuantity ?? null } : {}),
      ...(input.giftProductId !== undefined ? { giftProductId: input.giftProductId ?? null } : {}),
      ...(input.giftQuantity !== undefined ? { giftQuantity: input.giftQuantity ?? null } : {}),
    };

    const record = await this.db.promotion.update({
      where: { id },
      data,
      include: promotionInclude,
    });
    return toPromotion(record);
  }

  async delete(id: string): Promise<void> {
    await this.db.promotion.delete({ where: { id } });
  }

  async countOrdersUsingPromotion(promotionId: string): Promise<number> {
    return this.db.orderPromotion.count({
      where: { promotionId },
    });
  }

  async countActivePromotions(excludeId?: string): Promise<number> {
    return this.db.promotion.count({
      where: {
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async countHeroPromotions(excludeId?: string): Promise<number> {
    return this.db.promotion.count({
      where: {
        isActive: true,
        showInHero: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.db.promotion.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return false;
    return excludeId ? existing.id !== excludeId : true;
  }
}
