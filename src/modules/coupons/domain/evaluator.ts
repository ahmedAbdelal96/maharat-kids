import { Prisma } from "@prisma/client";
import { getCouponStatus } from "./status";
import type { CouponEvaluation } from "../types";

function money(value: Prisma.Decimal) { return value.toDecimalPlaces(2).toFixed(2); }

export function evaluateCoupon(input: {
  coupon: { isActive: boolean; startsAt: Date | string; endsAt?: Date | string | null; totalUsageLimit?: number | null; perCustomerUsageLimit?: number | null; type: "PERCENTAGE" | "FIXED_AMOUNT"; percentageDiscount: Prisma.Decimal | string | number | null; fixedDiscountAmount: Prisma.Decimal | string | number | null; minimumOrderSubtotal: Prisma.Decimal | string | number; maximumDiscountAmount: Prisma.Decimal | string | number | null; canCombineWithPromotions: boolean };
  subtotal: Prisma.Decimal | string | number;
  promotionDiscount?: Prisma.Decimal | string | number;
  totalRedeemed: number;
  customerRedeemed?: number;
  now?: Date;
}): CouponEvaluation {
  const now = input.now ?? new Date();
  const subtotal = new Prisma.Decimal(input.subtotal);
  const promotionDiscount = new Prisma.Decimal(input.promotionDiscount ?? 0);
  const status = getCouponStatus(input.coupon, input.totalRedeemed, now);
  const base = subtotal.sub(promotionDiscount).gt(0) ? subtotal.sub(promotionDiscount) : new Prisma.Decimal(0);
  if (status !== "ACTIVE") return { valid: false, applied: false, discountAmount: "0.00", baseSubtotal: money(base), reason: status === "SCHEDULED" ? "This coupon is not active yet." : status === "EXPIRED" ? "This coupon has expired." : status === "EXHAUSTED" ? "This coupon has reached its usage limit." : "This coupon is not valid.", usageState: status === "EXHAUSTED" ? "EXHAUSTED" : "AVAILABLE" };
  if (input.coupon.perCustomerUsageLimit != null && input.customerRedeemed != null && input.customerRedeemed >= input.coupon.perCustomerUsageLimit) return { valid: false, applied: false, discountAmount: "0.00", baseSubtotal: money(base), reason: "You have already used this coupon the maximum number of times.", usageState: "EXHAUSTED" };
  const minimum = new Prisma.Decimal(input.coupon.minimumOrderSubtotal);
  if (subtotal.lt(minimum)) return { valid: false, applied: false, discountAmount: "0.00", baseSubtotal: money(base), reason: `Add ${money(minimum.sub(subtotal))} more to use this coupon.`, usageState: "AVAILABLE" };
  let discount = input.coupon.type === "PERCENTAGE"
    ? base.mul(new Prisma.Decimal(input.coupon.percentageDiscount ?? 0)).div(100)
    : new Prisma.Decimal(input.coupon.fixedDiscountAmount ?? 0);
  if (input.coupon.type === "PERCENTAGE" && input.coupon.maximumDiscountAmount != null) discount = Prisma.Decimal.min(discount, new Prisma.Decimal(input.coupon.maximumDiscountAmount));
  discount = Prisma.Decimal.min(Prisma.Decimal.max(discount, new Prisma.Decimal(0)), base);
  return { valid: true, applied: true, discountAmount: money(discount), baseSubtotal: money(base), reason: null, usageState: "AVAILABLE" };
}

export function combineCouponWithPromotion(input: { coupon: CouponEvaluation; promotionDiscount: Prisma.Decimal | string | number; canCombineWithPromotions: boolean }): CouponEvaluation {
  const promotionDiscount = new Prisma.Decimal(input.promotionDiscount);
  if (!input.coupon.valid || promotionDiscount.lte(0) || input.canCombineWithPromotions) return input.coupon;
  if (new Prisma.Decimal(input.coupon.discountAmount).gt(promotionDiscount)) return input.coupon;
  return { ...input.coupon, applied: false, discountAmount: "0.00", reason: "This offer gives you a better discount than your coupon." };
}
