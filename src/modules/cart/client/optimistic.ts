import type { Cart } from "../types";

export function optimisticAddToCart(cart: Cart, quantity: number): Cart {
  return { ...cart, itemCount: cart.itemCount + quantity };
}

export function cartMutationKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "base"}`;
}
