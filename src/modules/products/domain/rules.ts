import { Prisma } from "@prisma/client";
import type { CreateProductInput } from "../types";

export const domainRules = {
  normalizeSku: (sku?: string | null) => sku?.trim().toUpperCase() || null,
  validatePricing(input: Pick<CreateProductInput, "marketPrices">) {
    for (const [priceValue, compareValue] of [[input.marketPrices.saudiPrice, input.marketPrices.saudiCompareAtPrice], [input.marketPrices.egyptPrice, input.marketPrices.egyptCompareAtPrice]] as const) {
      const price = new Prisma.Decimal(priceValue);
      if (price.isNegative()) throw new Error("PRICE_INVALID");
      if (compareValue != null) { const compareAtPrice = new Prisma.Decimal(compareValue); if (compareAtPrice.isNegative() || compareAtPrice.lessThanOrEqualTo(price)) throw new Error("COMPARE_PRICE_INVALID"); }
    }
  },
};
