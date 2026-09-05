import type { CouponStatus } from "../types";

export function getCouponStatus(coupon: { isActive: boolean; startsAt: Date | string; endsAt?: Date | string | null; totalUsageLimit?: number | null }, redeemedCount: number, now = new Date()): CouponStatus {
  if (!coupon.isActive) return "INACTIVE";
  if (new Date(coupon.startsAt).getTime() > now.getTime()) return "SCHEDULED";
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() <= now.getTime()) return "EXPIRED";
  if (coupon.totalUsageLimit != null && redeemedCount >= coupon.totalUsageLimit) return "EXHAUSTED";
  return "ACTIVE";
}

export function isCouponUsable(coupon: Parameters<typeof getCouponStatus>[0], redeemedCount: number, now = new Date()): boolean {
  return getCouponStatus(coupon, redeemedCount, now) === "ACTIVE";
}
