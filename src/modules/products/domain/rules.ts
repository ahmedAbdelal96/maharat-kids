import { Prisma } from "@prisma/client";
import type { CreateProductInput } from "../types";

export const domainRules = {
  normalizeSku: (sku?: string | null) => sku?.trim().toUpperCase() || null,
  validatePricing(input: Pick<CreateProductInput, "price" | "compareAtPrice">) {
    const price = new Prisma.Decimal(input.price);
    if (price.isNegative()) throw new Error("PRICE_INVALID");
    if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
      const compareAtPrice = new Prisma.Decimal(input.compareAtPrice);
      if (compareAtPrice.isNegative() || compareAtPrice.lessThanOrEqualTo(price)) throw new Error("COMPARE_PRICE_INVALID");
    }
  },
};
