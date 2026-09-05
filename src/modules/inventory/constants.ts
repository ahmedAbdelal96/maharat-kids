export const INVENTORY_FEATURE = "inventory" as const;
export const INVENTORY_CACHE_TAG = "inventory" as const;
export const LOW_STOCK_THRESHOLD = 5;

export const inventoryStates = [
  "UNTRACKED",
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
] as const;

export type InventoryState = (typeof inventoryStates)[number];
