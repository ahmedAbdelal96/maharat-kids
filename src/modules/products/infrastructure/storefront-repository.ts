import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { getPrismaClient } from "@/database/prisma";
import { resolveMarket } from "@/modules/market/server/resolver";
import { getApprovedRatingSummaries } from "@/modules/reviews/infrastructure/rating-aggregation";
import { resolvePublicMediaUrl } from "@/modules/media/domain/public-url";
import type { Market } from "@/modules/market/domain/market";
import type { ProductQuery, ProductId, StorefrontCardProduct, StorefrontProductPage } from "../types";

type StorefrontLocale = "ar" | "en";

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  description: true,
  status: true,
  fulfillmentType: true,
  categoryId: true,
  trackInventory: true,
  stockQuantity: true,
  createdAt: true,
  updatedAt: true,
  translations: { select: { locale: true, name: true } },
  images: {
    where: { isPrimary: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    take: 1,
    select: {
      id: true,
      mediaId: true,
      url: true,
      altText: true,
      sortOrder: true,
      isPrimary: true,
      media: { select: { url: true } },
    },
  },
  marketPrices: { select: { market: true, price: true, compareAtPrice: true } },
  variants: {
    select: {
      active: true,
      trackInventory: true,
      stockQuantity: true,
      marketPrices: { select: { market: true, price: true, compareAtPrice: true } },
    },
  },
};

type CardRecord = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

async function requestLocale(): Promise<StorefrontLocale> {
  try {
    return (await getLocale()) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function buildWhere(input: ProductQuery, locale: StorefrontLocale, market: Market): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    { status: "ACTIVE" },
    { marketPrices: { some: { market } } },
  ];
  if (input.featured !== undefined) and.push({ isFeatured: input.featured });
  if (input.search) {
    and.push({
      OR: [
        { name: { contains: input.search, mode: "insensitive" } },
        { sku: { contains: input.search, mode: "insensitive" } },
        { shortDescription: { contains: input.search, mode: "insensitive" } },
        { description: { contains: input.search, mode: "insensitive" } },
        { translations: { some: { locale, name: { contains: input.search, mode: "insensitive" } } } },
        { categoryAssignments: { some: { category: { isActive: true, OR: [{ name: { contains: input.search, mode: "insensitive" } }, { translations: { some: { locale, name: { contains: input.search, mode: "insensitive" } } } }] } } } },
      ],
    });
  }
  if (input.categorySlug) {
    and.push({ OR: [{ category: { slug: input.categorySlug, isActive: true } }, { categoryAssignments: { some: { category: { slug: input.categorySlug, isActive: true } } } }] });
  }
  if (input.categoryId) {
    and.push({ OR: [{ categoryId: input.categoryId }, { categoryAssignments: { some: { categoryId: input.categoryId, category: { isActive: true } } } }] });
  }
  if (input.ageMonths != null) and.push({ minAgeMonths: { lte: input.ageMonths }, maxAgeMonths: { gte: input.ageMonths } });
  if (input.skillIds?.length) and.push({ skillAssignments: { some: { skillId: { in: input.skillIds }, skill: { isActive: true } } } });
  if (input.productTypeIds?.length) and.push({ productTypeAssignments: { some: { productTypeId: { in: input.productTypeIds }, productType: { isActive: true } } } });
  if (input.language) and.push({ productLanguage: input.language });
  if (input.minPrice || input.maxPrice) {
    and.push({ marketPrices: { some: { market, price: { ...(input.minPrice ? { gte: new Prisma.Decimal(input.minPrice) } : {}), ...(input.maxPrice ? { lte: new Prisma.Decimal(input.maxPrice) } : {}) } } } });
  }
  if (input.inStock) {
    and.push({ OR: [{ variants: { some: { active: true, OR: [{ trackInventory: false }, { trackInventory: true, stockQuantity: { gt: 0 } }] } } }, { variants: { none: {} }, OR: [{ trackInventory: false }, { trackInventory: true, stockQuantity: { gt: 0 } }] }] });
  }
  return { AND: and };
}

function toCard(record: CardRecord, locale: StorefrontLocale, market: Market, ratingSummary?: StorefrontCardProduct["ratingSummary"]): StorefrontCardProduct {
  const translation = record.translations.find((item) => item.locale === locale) ?? record.translations.find((item) => item.locale === "ar");
  const marketPrice = record.marketPrices.find((item) => item.market === market);
  if (!marketPrice) throw new Error("MARKET_PRICE_MISSING");
  const activePurchasableVariants = record.variants.filter((variant) => variant.active && (!variant.trackInventory || variant.stockQuantity > 0));
  const effectivePrice = activePurchasableVariants.length
    ? Math.min(...activePurchasableVariants.map((variant) => Number(variant.marketPrices.find((price) => price.market === market)?.price ?? marketPrice.price)))
    : Number(marketPrice.price);
  const hasVariants = record.variants.length > 0;
  return {
    id: record.id as ProductId,
    name: translation?.name ?? record.name,
    slug: record.slug,
    sku: record.sku,
    shortDescription: record.shortDescription,
    description: record.description,
    price: effectivePrice.toFixed(2),
    compareAtPrice: marketPrice.compareAtPrice?.toFixed(2) ?? null,
    status: record.status,
    fulfillmentType: record.fulfillmentType,
    categoryName: null,
    categorySlug: null,
    categoryId: record.categoryId,
    trackInventory: hasVariants ? true : record.trackInventory,
    stockQuantity: hasVariants ? record.variants.reduce((total, variant) => total + (variant.trackInventory ? variant.stockQuantity : 1), 0) : record.stockQuantity,
    hasVariants,
    images: record.images.map((image) => ({ id: image.id, mediaId: image.mediaId, url: resolvePublicMediaUrl(image.media?.url ?? image.url), altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(ratingSummary ? { ratingSummary } : {}),
  };
}

export class StorefrontProductRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findCards(input: ProductQuery): Promise<StorefrontProductPage> {
    const [locale, market] = await Promise.all([requestLocale(), resolveMarket()]);
    const where = buildWhere(input, locale, market.market);
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 24;
    const [total, records] = await Promise.all([
      this.db.product.count({ where }),
      this.db.product.findMany({
        where,
        select: cardSelect,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const summaries = await getApprovedRatingSummaries(this.db, records.map((record) => record.id));
    return {
      items: records.map((record) => toCard(record, locale, market.market, summaries.get(record.id))),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findRelatedCards(categoryId: string | null, excludeId: ProductId, limit: number, locale?: StorefrontLocale, market?: Market): Promise<StorefrontCardProduct[]> {
    if (!categoryId || limit <= 0) return [];
    const [resolvedLocale, resolvedMarket] = await Promise.all([locale ?? requestLocale(), market ? Promise.resolve({ market }) : resolveMarket()]);
    type RelatedRow = {
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      shortDescription: string | null;
      description: string | null;
      status: StorefrontCardProduct["status"];
      fulfillmentType: StorefrontCardProduct["fulfillmentType"];
      categoryId: string | null;
      trackInventory: boolean;
      stockQuantity: number;
      createdAt: Date;
      updatedAt: Date;
      imageId: string | null;
      mediaId: string | null;
      imageUrl: string | null;
      altText: string | null;
      sortOrder: number | null;
      isPrimary: boolean | null;
      price: Prisma.Decimal;
      compareAtPrice: Prisma.Decimal | null;
      variants: Array<{ active: boolean; trackInventory: boolean; stockQuantity: number; price: Prisma.Decimal | null }>;
    };
    const rows = await this.db.$queryRaw<RelatedRow[]>(Prisma.sql`
      SELECT p."id", COALESCE(pt."name", pta."name", p."name") AS "name", p."slug", p."sku",
        COALESCE(pt."shortDescription", pta."shortDescription", p."shortDescription") AS "shortDescription",
        COALESCE(pt."description", pta."description", p."description") AS "description",
        p."status", p."fulfillmentType", p."categoryId", p."trackInventory", p."stockQuantity", p."createdAt", p."updatedAt",
        image."imageId", image."mediaId", image."imageUrl", image."altText", image."sortOrder", image."isPrimary",
        mp."price", mp."compareAtPrice",
        COALESCE(variants."variants", '[]'::json) AS "variants"
      FROM "Product" p
      LEFT JOIN "ProductTranslation" pt ON pt."productId" = p."id" AND pt."locale" = ${resolvedLocale}::"ContentLocale"
      LEFT JOIN "ProductTranslation" pta ON pta."productId" = p."id" AND pta."locale" = 'ar'::"ContentLocale"
      INNER JOIN "ProductMarketPrice" mp ON mp."productId" = p."id" AND mp."market" = ${resolvedMarket.market}::"Market"
      LEFT JOIN LATERAL (
        SELECT pi."id" AS "imageId", pi."mediaId", COALESCE(m."url", pi."url") AS "imageUrl", pi."altText", pi."sortOrder", pi."isPrimary"
        FROM "ProductImage" pi LEFT JOIN "Media" m ON m."id" = pi."mediaId"
        WHERE pi."productId" = p."id"
        ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC, pi."createdAt" ASC
        LIMIT 1
      ) image ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('active', v."active", 'trackInventory', v."trackInventory", 'stockQuantity', v."stockQuantity", 'price', vmp."price")) AS "variants"
        FROM "ProductVariant" v
        LEFT JOIN "ProductVariantMarketPrice" vmp ON vmp."variantId" = v."id" AND vmp."market" = ${resolvedMarket.market}::"Market"
        WHERE v."productId" = p."id"
      ) variants ON TRUE
      WHERE p."id" <> ${excludeId} AND p."categoryId" = ${categoryId} AND p."status" = 'ACTIVE'::"ProductStatus"
      ORDER BY p."isFeatured" DESC, p."createdAt" DESC
      LIMIT ${limit}
    `);
    const summaries = await getApprovedRatingSummaries(this.db, rows.map((row) => row.id));
    return rows.map((row) => {
      const variants = row.variants ?? [];
      const purchasable = variants.filter((variant) => variant.active && (!variant.trackInventory || variant.stockQuantity > 0));
      const effectivePrice = purchasable.length ? Math.min(...purchasable.map((variant) => Number(variant.price ?? row.price))) : Number(row.price);
      return {
        id: row.id as ProductId,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        shortDescription: row.shortDescription,
        description: row.description,
        price: effectivePrice.toFixed(2),
        compareAtPrice: row.compareAtPrice?.toFixed(2) ?? null,
        status: row.status,
        fulfillmentType: row.fulfillmentType,
        categoryName: null,
        categorySlug: null,
        categoryId: row.categoryId,
        trackInventory: variants.length ? true : row.trackInventory,
        stockQuantity: variants.length ? variants.reduce((total, variant) => total + (variant.trackInventory ? variant.stockQuantity : 1), 0) : row.stockQuantity,
        hasVariants: variants.length > 0,
        images: row.imageId ? [{ id: row.imageId, mediaId: row.mediaId, url: resolvePublicMediaUrl(row.imageUrl), altText: row.altText, sortOrder: row.sortOrder ?? 0, isPrimary: row.isPrimary ?? true }] : [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        ...(summaries.get(row.id) ? { ratingSummary: summaries.get(row.id) } : {}),
      } satisfies StorefrontCardProduct;
    });
  }
}
