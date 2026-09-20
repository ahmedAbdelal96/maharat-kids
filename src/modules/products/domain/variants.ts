import { Prisma, type Market } from "@prisma/client";

export const VARIANT_COMBINATION_LIMIT = 500;

export type VariantSelection = { optionId: string; optionValueId: string };

/** Stable, order-independent key used by the database uniqueness constraint. */
export function combinationKey(selection: VariantSelection[]): string {
  const byOption = new Map<string, string>();
  for (const item of selection) {
    if (byOption.has(item.optionId)) throw new Error("DUPLICATE_OPTION_SELECTION");
    byOption.set(item.optionId, item.optionValueId);
  }
  return [...byOption.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([optionId, valueId]) => `${optionId}:${valueId}`).join("|");
}

export function generateCombinations(options: Array<{ id: string; values: Array<{ id: string }> }>): VariantSelection[][] {
  const active = options.filter((option) => option.values.length > 0);
  if (active.length === 0) return [];
  const count = active.reduce((total, option) => total * option.values.length, 1);
  if (count > VARIANT_COMBINATION_LIMIT) throw new Error("VARIANT_COMBINATION_LIMIT");
  return active.reduce<VariantSelection[][]>((rows, option) => rows.flatMap((row) => option.values.map((value) => [...row, { optionId: option.id, optionValueId: value.id }])), [[]]);
}

export function effectiveVariantPrice(input: { productPrice?: Prisma.Decimal | null; productCompareAtPrice?: Prisma.Decimal | null; variantPrice?: Prisma.Decimal | null; variantCompareAtPrice?: Prisma.Decimal | null }, market: Market) {
  const price = input.variantPrice ?? input.productPrice;
  const compareAtPrice = input.variantCompareAtPrice ?? input.productCompareAtPrice;
  if (!price) throw new Error(`MARKET_PRICE_MISSING:${market}`);
  if (compareAtPrice && compareAtPrice.lt(price)) throw new Error("COMPARE_PRICE_INVALID");
  return { price, compareAtPrice };
}

export function variantIsPurchasable(variant: { active: boolean; trackInventory: boolean; stockQuantity: number }) {
  return variant.active && (!variant.trackInventory || variant.stockQuantity > 0);
}

