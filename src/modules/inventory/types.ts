export type InventoryItemId = string & { readonly __brand: "InventoryItemId"; };

export type InventoryItem = {
  id: InventoryItemId;
  productId: string;
  availableQuantity: number;
};

export type AdjustInventoryInput = {
  productId: string; quantityDelta: number;
};

import type { InventoryState } from "./constants";

export type InventoryProduct = {
  id: string;
  name: string;
  sku: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  trackInventory: boolean;
  stockQuantity: number;
  categoryName: string | null;
  imageUrl: string | null;
};

export type InventoryFilter =
  | "ALL"
  | "TRACKED"
  | "UNTRACKED"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

export type InventoryQuery = {
  search?: string;
  filter?: InventoryFilter;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  page?: number;
  pageSize?: number;
};

export type InventoryPage = {
  items: InventoryProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    all: number;
    tracked: number;
    untracked: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
};

export type InventoryStatus = InventoryProduct & { inventoryState: InventoryState };
