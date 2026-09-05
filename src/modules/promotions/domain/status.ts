import type { PromotionStatus } from "../types";

export function getPromotionStatus(
  promotion: {
    isActive: boolean;
    startsAt: Date | string;
    endsAt?: Date | string | null;
  },
  now = new Date(),
): PromotionStatus {
  if (!promotion.isActive) {
    return "INACTIVE";
  }

  const startDate = new Date(promotion.startsAt);
  if (startDate.getTime() > now.getTime()) {
    return "SCHEDULED";
  }

  if (promotion.endsAt) {
    const endDate = new Date(promotion.endsAt);
    if (endDate.getTime() <= now.getTime()) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

export function isPromotionCurrentlyActive(
  promotion: {
    isActive: boolean;
    startsAt: Date | string;
    endsAt?: Date | string | null;
  },
  now = new Date(),
): boolean {
  return getPromotionStatus(promotion, now) === "ACTIVE";
}
