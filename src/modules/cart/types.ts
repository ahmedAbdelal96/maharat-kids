import type { AppliedPromotionBenefit, GiftLineItem } from "@/modules/promotions/types";

export type AppliedCoupon = { code: string; name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; discountAmount: string };

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  availableStock: number | null;
  isAvailable: boolean;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  originalSubtotal: string;
  discountAmount: string;
  appliedPromotion: AppliedPromotionBenefit | null;
  giftItems: GiftLineItem[];
  progressHint: string | null;
  warnings: string[];
  coupon: AppliedCoupon | null;
  couponDiscount: string;
  couponMessage: string | null;
};

export type CartContext =
  | { kind: "customer"; customerId: string }
  | { kind: "guest"; guestTokenHash: string };

export type CartMergeResult = {
  cart: Cart;
  warnings: string[];
  merged: boolean;
};
