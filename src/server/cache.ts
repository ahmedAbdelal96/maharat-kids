import "server-only";

import { revalidateTag } from "next/cache";

export const cacheTags = {
  products: "products",
  categories: "categories",
  inventory: "inventory",
  orders: "orders",
  storeSettings: "store-settings",
} as const;

export type CacheTag = (typeof cacheTags)[keyof typeof cacheTags];

/** Central cache invalidation boundary for mutations. */
export function revalidateFeature(tag: CacheTag): void {
  revalidateTag(tag, "max");
}
