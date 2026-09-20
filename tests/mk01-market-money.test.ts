import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCoupon } from "../src/modules/coupons/domain/evaluator";
import { createCouponSchema } from "../src/modules/coupons/schema";

const base = { isActive: true, startsAt: new Date("2026-01-01"), endsAt: null, type: "FIXED_AMOUNT" as const, percentageDiscount: null, canCombineWithPromotions: false };

test("Saudi coupon rule applies SAR amount without reading Egypt amount", () => {
  const result = evaluateCoupon({ coupon: { ...base, fixedDiscountAmount: "20", minimumOrderSubtotal: "100", maximumDiscountAmount: null }, subtotal: "150", totalRedeemed: 0 });
  assert.equal(result.valid, true);
  assert.equal(result.discountAmount, "20.00");
});

test("Egypt coupon rule applies EGP amount without reading Saudi amount", () => {
  const result = evaluateCoupon({ coupon: { ...base, fixedDiscountAmount: "200", minimumOrderSubtotal: "1000", maximumDiscountAmount: null }, subtotal: "1500", totalRedeemed: 0 });
  assert.equal(result.valid, true);
  assert.equal(result.discountAmount, "200.00");
});

test("market coupon configuration requires both explicit rules", () => {
  const parsed = createCouponSchema.safeParse({ name: "No cross-currency fallback", code: "NOFALLBACK", type: "FIXED_AMOUNT", isActive: true, startsAt: new Date(), canCombineWithPromotions: false, marketRules: { SAUDI_ARABIA: { fixedDiscountAmount: 20, minimumOrderSubtotal: 100 } } });
  assert.equal(parsed.success, false);
});
