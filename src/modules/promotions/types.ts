import type { PromotionType as PrismaPromotionType } from "@prisma/client";

export type PromotionType = PrismaPromotionType;

export type PromotionStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE";

export type PromotionProductRef = {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  status: string;
};

export type Promotion = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  type: PromotionType;
  isActive: boolean;
  showInHero: boolean;
  showOnOffersPage: boolean;
  bannerMediaId: string | null;
  bannerUrl: string | null;
  priority: number;
  startsAt: string;
  endsAt: string | null;
  status: PromotionStatus;

  // Rule fields
  minimumOrderSubtotal: string | null;
  percentageDiscount: string | null;
  fixedDiscountAmount: string | null;
  qualifyingProductId: string | null;
  qualifyingProduct: PromotionProductRef | null;
  buyQuantity: number | null;
  giftProductId: string | null;
  giftProduct: PromotionProductRef | null;
  giftQuantity: number | null;

  createdAt: string;
  updatedAt: string;
  orderCount?: number;
};

export type PromotionSummary = Pick<
  Promotion,
  | "id"
  | "name"
  | "slug"
  | "shortDescription"
  | "type"
  | "isActive"
  | "showInHero"
  | "showOnOffersPage"
  | "bannerUrl"
  | "priority"
  | "startsAt"
  | "endsAt"
  | "status"
  | "percentageDiscount"
  | "fixedDiscountAmount"
  | "minimumOrderSubtotal"
  | "buyQuantity"
  | "giftQuantity"
  | "createdAt"
> & {
  qualifyingProductName: string | null;
  giftProductName: string | null;
  orderCount: number;
};

export type PromotionRuleSnapshot = {
  minimumOrderSubtotal?: string | null;
  percentageDiscount?: string | null;
  fixedDiscountAmount?: string | null;
  qualifyingProductId?: string | null;
  qualifyingProductName?: string | null;
  buyQuantity?: number | null;
  giftProductId?: string | null;
  giftProductName?: string | null;
  giftQuantity?: number | null;
  benefitDescription?: string;
};

export type EvaluationCartItem = {
  productId: string;
  name?: string;
  imageUrl?: string | null;
  unitPrice: string | number;
  quantity: number;
  trackInventory?: boolean;
  availableStock?: number | null;
};

export type GiftLineItem = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: "0.00";
  originalPrice: string;
  quantity: number;
  promotionId: string;
  promotionName: string;
  trackInventory: boolean;
};

export type AppliedPromotionBenefit = {
  promotionId: string;
  promotionName: string;
  promotionSlug: string;
  promotionType: PromotionType;
  discountAmount: string;
  benefitDescription: string;
  ruleSnapshot: PromotionRuleSnapshot;
  giftItems: GiftLineItem[];
};

export type PromotionEvaluationResult = {
  appliedPromotion: AppliedPromotionBenefit | null;
  discountAmount: string;
  giftItems: GiftLineItem[];
  eligiblePromotions: Array<{
    promotionId: string;
    promotionName: string;
    promotionType: PromotionType;
    benefitAmount: string;
  }>;
  progressHint: string | null;
};

export type CreatePromotionInput = {
  name: string;
  shortDescription: string;
  description?: string | null;
  type: PromotionType;
  isActive: boolean;
  showInHero: boolean;
  showOnOffersPage: boolean;
  bannerMediaId?: string | null;
  priority: number;
  startsAt: Date | string;
  endsAt?: Date | string | null;

  minimumOrderSubtotal?: string | number | null;
  percentageDiscount?: string | number | null;
  fixedDiscountAmount?: string | number | null;
  qualifyingProductId?: string | null;
  buyQuantity?: number | null;
  giftProductId?: string | null;
  giftQuantity?: number | null;
};

export type UpdatePromotionInput = Partial<CreatePromotionInput> & {
  id: string;
};

export type PromotionQuery = {
  status?: PromotionStatus | "ALL";
  heroOnly?: boolean;
  offersPageOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};
