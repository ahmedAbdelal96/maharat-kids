import { LOW_STOCK_THRESHOLD, type InventoryState } from "../constants";

export type InventoryInput = {
  trackInventory: boolean;
  stockQuantity: number;
};

export function getInventoryState({ trackInventory, stockQuantity }: InventoryInput): InventoryState {
  if (!trackInventory) return "UNTRACKED";
  if (stockQuantity <= 0) return "OUT_OF_STOCK";
  if (stockQuantity <= LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
}

export function isInventoryAvailable(input: InventoryInput): boolean {
  return getInventoryState(input) !== "OUT_OF_STOCK";
}

export function canPurchaseQuantity(input: InventoryInput, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && (!input.trackInventory || quantity <= input.stockQuantity);
}
