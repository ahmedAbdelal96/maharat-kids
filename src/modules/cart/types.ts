import type { AppliedPromotionBenefit, GiftLineItem } from "@/modules/promotions/types";
import type { Market } from "@/modules/market/domain/market";

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
  market: Market | null;
  currency: "SAR" | "EGP" | null;
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
  | { kind: "customer"; customerId: string; market: Market }
  | { kind: "guest"; guestTokenHash: string; market: Market };

export type CartMergeResult = {
  cart: Cart;
  warnings: string[];
  merged: boolean;
};
