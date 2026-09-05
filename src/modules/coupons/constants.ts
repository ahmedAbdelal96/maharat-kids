import type { CouponType } from "@prisma/client";

export const COUPON_PERMISSION = {
  view: "coupons.view",
  create: "coupons.create",
  update: "coupons.update",
  delete: "coupons.delete",
} as const;

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed amount",
};

export const COUPON_STATUS_LABELS = {
  INACTIVE: "Inactive",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  EXHAUSTED: "Exhausted",
} as const;
