export const promotionTypes = [
  "ORDER_PERCENTAGE_DISCOUNT",
  "ORDER_FIXED_DISCOUNT",
  "BUY_X_GET_Y_FREE",
] as const;

export type PromotionType = (typeof promotionTypes)[number];

export const promotionTypeLabels: Record<PromotionType, string> = {
  ORDER_PERCENTAGE_DISCOUNT: "Spend & Save (%)",
  ORDER_FIXED_DISCOUNT: "Spend & Save (Fixed)",
  BUY_X_GET_Y_FREE: "Buy X Get Y Free",
};

export const PROMOTION_TYPE_LABELS = promotionTypeLabels;

export const promotionStatuses = ["ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE"] as const;

export const promotionPermissions = {
  view: "promotions.view",
  create: "promotions.create",
  update: "promotions.update",
  delete: "promotions.delete",
} as const;

export const DEFAULT_MAX_ACTIVE_OFFERS = 10;
export const DEFAULT_MAX_HERO_OFFERS = 3;
