import type { CouponRedemptionStatus, CouponType, Market } from "@prisma/client";

export type { CouponRedemptionStatus, CouponType };
export type CouponStatus = "INACTIVE" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "EXHAUSTED";

export type Coupon = {
  id: string;
  name: string;
  code: string;
  type: CouponType;
  percentageDiscount: string | null;
  fixedDiscountAmount: string | null;
  minimumOrderSubtotal: string;
  maximumDiscountAmount: string | null;
  marketRules: Record<Market, { fixedDiscountAmount: string | null; minimumOrderSubtotal: string; maximumDiscountAmount: string | null }>;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
  canCombineWithPromotions: boolean;
  status: CouponStatus;
  redeemedCount: number;
  uniqueCustomerCount?: number;
  discountGiven?: string;
  createdAt: string;
  updatedAt: string;
};

export type CouponRedemption = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  orderId: string;
  orderNumber: string;
  orderSubtotal: string;
  orderTotal: string;
  discountAmount: string;
  status: CouponRedemptionStatus;
  redeemedAt: string;
  reversedAt: string | null;
};

export type CouponDetail = Coupon & {
  redemptions: CouponRedemption[];
  grossMerchandiseValue: string;
  netMerchandiseValue: string;
  remainingUses: number | null;
};

export type CouponEvaluation = {
  valid: boolean;
  applied: boolean;
  discountAmount: string;
  baseSubtotal: string;
  reason: string | null;
  usageState: "AVAILABLE" | "EXHAUSTED" | "UNKNOWN";
};

export type CouponQuery = {
  status?: CouponStatus | "ALL";
  type?: CouponType | "ALL";
  search?: string;
};

export type CreateCouponInput = {
  name: string;
  code: string;
  type: CouponType;
  percentageDiscount?: string | number | null;
  fixedDiscountAmount?: string | number | null;
  minimumOrderSubtotal?: string | number;
  maximumDiscountAmount?: string | number | null;
  marketRules: Record<Market, { fixedDiscountAmount?: string | number | null; minimumOrderSubtotal?: string | number; maximumDiscountAmount?: string | number | null }>;
  isActive: boolean;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  totalUsageLimit?: number | null;
  perCustomerUsageLimit?: number | null;
  canCombineWithPromotions: boolean;
};

export type UpdateCouponInput = Partial<CreateCouponInput> & { id: string };
