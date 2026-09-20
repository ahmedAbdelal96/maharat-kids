import "server-only";

import { PrismaClient } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { getPrismaClient } from "@/database/prisma";
import { getInventoryState } from "@/modules/inventory/domain/inventory";
import { getApprovedRatingSummaries } from "@/modules/reviews/infrastructure/rating-aggregation";
import { normalizeSearchQuery, searchRank } from "../domain/normalization";
import { resolveMarket } from "@/modules/market/server/resolver";
import type { SearchSuggestionCategory, SearchSuggestionProduct, SearchSuggestions } from "../types";

type ProductSuggestionRecord = {
  id: string;
  name: string;
  slug: string;
  price: { toFixed: (digits: number) => string };
  compareAtPrice: { toFixed: (digits: number) => string } | null;
  trackInventory: boolean;
  stockQuantity: number;
  category: { name: string; slug: string } | null;
  translations?: { locale: "ar" | "en"; name: string; shortDescription: string | null; description: string | null }[];
  images: Array<{ url: string | null; media: { url: string } | null }>;
  variants?: Array<{ active: boolean; trackInventory: boolean; stockQuantity: number; marketPrices: Array<{ price: { toFixed: (digits: number) => string }; compareAtPrice: { toFixed: (digits: number) => string } | null }> }>;
};

export interface SearchRepository {
  findSuggestions(query: string, locale?: "ar" | "en"): Promise<SearchSuggestions>;
}

function imageUrl(images: ProductSuggestionRecord["images"]): string | null {
  return images[0]?.media?.url ?? images[0]?.url ?? null;
}

function toAvailability(product: Pick<ProductSuggestionRecord, "trackInventory" | "stockQuantity">): SearchSuggestionProduct["availability"] {
  const state = getInventoryState(product);
  if (state === "UNTRACKED") return "AVAILABLE";
  if (state === "LOW_STOCK") return "LOW_STOCK";
  if (state === "OUT_OF_STOCK") return "OUT_OF_STOCK";
  return "IN_STOCK";
}

export class PrismaSearchRepository implements SearchRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findSuggestions(rawQuery: string, requestedLocale?: "ar" | "en"): Promise<SearchSuggestions> {
    const query = normalizeSearchQuery(rawQuery);
    if (query.length < 2) return { query, products: [], categories: [] };
    const market = await resolveMarket();
    let locale: "ar" | "en" = requestedLocale ?? "ar";
    if (!requestedLocale) {
      try { locale = (await getLocale()) === "en" ? "en" : "ar"; } catch { /* API requests without a locale use the default. */ }
    }

    const contains = { contains: query, mode: "insensitive" as const };
    const [products, categories] = await Promise.all([
      this.db.product.findMany({
        where: {
          status: "ACTIVE",
          marketPrices: { some: { market: market.market } },
          OR: [
            { name: contains },
            { shortDescription: contains },
            { description: contains },
            { translations: { some: { locale, name: contains } } },
            { category: { is: { isActive: true, name: contains } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          marketPrices: { where: { market: market.market }, select: { price: true, compareAtPrice: true } },
          trackInventory: true,
          stockQuantity: true,
          variants: { where: { active: true }, select: { active: true, trackInventory: true, stockQuantity: true, marketPrices: { where: { market: market.market }, select: { price: true, compareAtPrice: true } } } },
          category: { select: { name: true, slug: true } },
          translations: { select: { locale: true, name: true, shortDescription: true, description: true } },
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { url: true, media: { select: { url: true } } },
          },
        },
        take: 24,
      }),
      this.db.category.findMany({
        where: { isActive: true, OR: [{ name: contains }, { translations: { some: { locale, name: contains } } }] },
        select: { id: true, name: true, slug: true, parent: { select: { name: true } }, translations: { select: { locale: true, name: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 8,
      }),
    ]);

    const summaries = await getApprovedRatingSummaries(this.db, products.map((product) => product.id));
    const displayName = (record: { name: string; translations?: { locale: "ar" | "en"; name: string }[] }) => record.translations?.find((item) => item.locale === locale)?.name ?? record.translations?.find((item) => item.locale === "ar")?.name ?? record.name;
    const sortedProducts = [...products].sort((left, right) => {
      const leftName = displayName(left);
      const rightName = displayName(right);
      const leftRank = Math.min(searchRank(leftName, query), left.category ? searchRank(left.category.name, query) + 1 : 99);
      const rightRank = Math.min(searchRank(rightName, query), right.category ? searchRank(right.category.name, query) + 1 : 99);
      return leftRank - rightRank || leftName.localeCompare(rightName);
    }).slice(0, 6);

    const productSuggestions: SearchSuggestionProduct[] = sortedProducts.map((product) => {
      const ratingSummary = summaries.get(product.id);
      return {
        type: "product",
        id: product.id,
        slug: product.slug,
        name: displayName(product),
        imageUrl: imageUrl(product.images),
        price: product.variants?.length && product.variants.some((variant) => !variant.trackInventory || variant.stockQuantity > 0) ? Math.min(...product.variants.filter((variant) => !variant.trackInventory || variant.stockQuantity > 0).map((variant) => Number(variant.marketPrices[0]?.price.toFixed(2) ?? product.marketPrices[0]?.price.toFixed(2) ?? product.price.toFixed(2)))).toFixed(2) : product.marketPrices[0]?.price.toFixed(2) ?? product.price.toFixed(2),
        compareAtPrice: product.marketPrices[0]?.compareAtPrice?.toFixed(2) ?? product.compareAtPrice?.toFixed(2) ?? null,
        availability: product.variants?.length ? (product.variants.some((variant) => !variant.trackInventory || variant.stockQuantity > 0) ? "IN_STOCK" : "OUT_OF_STOCK") : toAvailability(product),
        categoryName: product.category?.name ?? null,
        ...(ratingSummary ? { ratingSummary } : {}),
      };
    });

    const categorySuggestions: SearchSuggestionCategory[] = categories
      .sort((left, right) => searchRank(left.translations?.find((item) => item.locale === locale)?.name ?? left.name, query) - searchRank(right.translations?.find((item) => item.locale === locale)?.name ?? right.name, query))
      .slice(0, 4)
      .map((category) => ({ type: "category", id: category.id, slug: category.slug, name: category.translations?.find((item) => item.locale === locale)?.name ?? category.name, parentName: category.parent?.name ?? null }));

    return { query, currency: market.configuration.currency, products: productSuggestions, categories: categorySuggestions };
  }
}
