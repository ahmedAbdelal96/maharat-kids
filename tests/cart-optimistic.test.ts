import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cartMutationKey, optimisticAddToCart } from "../src/modules/cart/client/optimistic";
import type { Cart } from "../src/modules/cart/types";

const cart = {
  id: "cart-1",
  market: "EGYPT",
  currency: "EGP",
  items: [],
  itemCount: 2,
  subtotal: "100.00",
  originalSubtotal: "100.00",
  discountAmount: "0.00",
  appliedPromotion: null,
  giftItems: [],
  progressHint: null,
  warnings: [],
  coupon: null,
  couponDiscount: "0.00",
  couponMessage: null,
} as Cart;

test("optimistic add updates only the safe cart count", () => {
  const next = optimisticAddToCart(cart, 2);
  assert.equal(next.itemCount, 4);
  assert.equal(next.subtotal, cart.subtotal);
  assert.deepEqual(next.items, cart.items);
});

test("failed optimistic add can rollback to the canonical snapshot", () => {
  const snapshot = { ...cart };
  const optimistic = optimisticAddToCart(cart, 1);
  assert.equal(optimistic.itemCount, 3);
  assert.equal(snapshot.itemCount, 2);
});

test("cart mutation keys isolate product variants", () => {
  assert.notEqual(cartMutationKey("product-1", null), cartMutationKey("product-1", "variant-1"));
  assert.equal(cartMutationKey("product-1", null), "product-1:base");
});

test("storefront cart mutations avoid broad router refreshes", () => {
  const productActions = readFileSync("src/components/ecommerce/product-detail-actions.tsx", "utf8");
  const drawer = readFileSync("src/components/ecommerce/cart-drawer.tsx", "utf8");
  assert.doesNotMatch(productActions, /router\.refresh\(\)/);
  assert.doesNotMatch(drawer, /router\.refresh\(\)/);
  assert.match(productActions, /addOptimistically/);
  assert.match(productActions, /isPending/);
});
