import "server-only";

import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { getInventoryState } from "@/modules/inventory/domain/inventory";
import { getApprovedRatingSummaries } from "@/modules/reviews/infrastructure/rating-aggregation";
import { normalizeSearchQuery, searchRank } from "../domain/normalization";
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
  images: Array<{ url: string | null; media: { url: string } | null }>;
};

export interface SearchRepository {
  findSuggestions(query: string): Promise<SearchSuggestions>;
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

  async findSuggestions(rawQuery: string): Promise<SearchSuggestions> {
    const query = normalizeSearchQuery(rawQuery);
    if (query.length < 2) return { query, products: [], categories: [] };

    const contains = { contains: query, mode: "insensitive" as const };
    const [products, categories] = await Promise.all([
      this.db.product.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: contains },
            { shortDescription: contains },
            { description: contains },
            { category: { is: { isActive: true, name: contains } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          trackInventory: true,
          stockQuantity: true,
          category: { select: { name: true, slug: true } },
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { url: true, media: { select: { url: true } } },
          },
        },
        take: 24,
      }),
      this.db.category.findMany({
        where: { isActive: true, name: contains },
        select: { id: true, name: true, slug: true, parent: { select: { name: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 8,
      }),
    ]);

    const summaries = await getApprovedRatingSummaries(this.db, products.map((product) => product.id));
    const sortedProducts = [...products].sort((left, right) => {
      const leftRank = Math.min(searchRank(left.name, query), left.category ? searchRank(left.category.name, query) + 1 : 99);
      const rightRank = Math.min(searchRank(right.name, query), right.category ? searchRank(right.category.name, query) + 1 : 99);
      return leftRank - rightRank || left.name.localeCompare(right.name);
    }).slice(0, 6);

    const productSuggestions: SearchSuggestionProduct[] = sortedProducts.map((product) => {
      const ratingSummary = summaries.get(product.id);
      return {
        type: "product",
        id: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: imageUrl(product.images),
        price: product.price.toFixed(2),
        compareAtPrice: product.compareAtPrice?.toFixed(2) ?? null,
        availability: toAvailability(product),
        categoryName: product.category?.name ?? null,
        ...(ratingSummary ? { ratingSummary } : {}),
      };
    });

    const categorySuggestions: SearchSuggestionCategory[] = categories
      .sort((left, right) => searchRank(left.name, query) - searchRank(right.name, query) || left.name.localeCompare(right.name))
      .slice(0, 4)
      .map((category) => ({ type: "category", id: category.id, slug: category.slug, name: category.name, parentName: category.parent?.name ?? null }));

    return { query, products: productSuggestions, categories: categorySuggestions };
  }
}
