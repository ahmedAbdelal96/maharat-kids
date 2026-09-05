import type { ReturnStatus } from "@prisma/client";

type PromotionSnapshot = { promotionType: string; ruleSnapshot: unknown };
type ReturnOrderItem = { id: string; productId: string; quantity: number; isPromotionGift: boolean };
type ReturnReservation = { items: Array<{ orderItemId: string; requestedQuantity: number; approvedQuantity: number | null }> };

const transitions: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["RETURNING", "RECEIVED"],
  REJECTED: [],
  CANCELLED: [],
  RETURNING: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransitionReturnStatus(current: ReturnStatus, next: ReturnStatus): boolean {
  return transitions[current].includes(next);
}

export function isReturnEligibleOrder(status: string): boolean {
  return status === "DELIVERED" || status === "COMPLETED";
}

export function isActiveReturnStatus(status: ReturnStatus): boolean {
  return !["REJECTED", "CANCELLED"].includes(status);
}

/** Ensures a BOGO return also gives back gifts no longer earned. */
export function hasRequiredPromotionGiftReturn(input: {
  orderItems: ReturnOrderItem[];
  promotions: PromotionSnapshot[];
  existingReturns: ReturnReservation[];
  requestedItems: Array<{ orderItemId: string; quantity: number }>;
}): boolean {
  const requestedByItem = new Map<string, number>();
  for (const item of input.requestedItems) requestedByItem.set(item.orderItemId, (requestedByItem.get(item.orderItemId) ?? 0) + item.quantity);

  for (const promotion of input.promotions) {
    if (promotion.promotionType !== "BUY_X_GET_Y_FREE" || !promotion.ruleSnapshot || typeof promotion.ruleSnapshot !== "object") continue;
    const snapshot = promotion.ruleSnapshot as Record<string, unknown>;
    const qualifyingProductId = typeof snapshot.qualifyingProductId === "string" ? snapshot.qualifyingProductId : null;
    const giftProductId = typeof snapshot.giftProductId === "string" ? snapshot.giftProductId : null;
    const buyQuantity = typeof snapshot.buyQuantity === "number" ? snapshot.buyQuantity : 0;
    const giftQuantity = typeof snapshot.giftQuantity === "number" ? snapshot.giftQuantity : 0;
    if (!qualifyingProductId || !giftProductId || buyQuantity < 1 || giftQuantity < 1) continue;

    const qualifyingItems = input.orderItems.filter((item) => item.productId === qualifyingProductId && !item.isPromotionGift);
    const giftItems = input.orderItems.filter((item) => item.productId === giftProductId && item.isPromotionGift);
    const originalQualifyingQuantity = qualifyingItems.reduce((sum, item) => sum + item.quantity, 0);
    const originalGiftQuantity = giftItems.reduce((sum, item) => sum + item.quantity, 0);
    if (originalQualifyingQuantity < buyQuantity || originalGiftQuantity === 0) continue;

    const activeReturnedByItem = new Map<string, number>();
    for (const request of input.existingReturns) for (const item of request.items) activeReturnedByItem.set(item.orderItemId, (activeReturnedByItem.get(item.orderItemId) ?? 0) + (item.approvedQuantity ?? item.requestedQuantity));
    const qualifyingReturned = qualifyingItems.reduce((sum, item) => sum + (activeReturnedByItem.get(item.id) ?? 0) + (requestedByItem.get(item.id) ?? 0), 0);
    const giftReturned = giftItems.reduce((sum, item) => sum + (activeReturnedByItem.get(item.id) ?? 0) + (requestedByItem.get(item.id) ?? 0), 0);
    const remainingQualifying = Math.max(0, originalQualifyingQuantity - qualifyingReturned);
    const stillEarnedGift = Math.floor(remainingQualifying / buyQuantity) * giftQuantity;
    if (giftReturned < Math.max(0, originalGiftQuantity - stillEarnedGift)) return false;
  }
  return true;
}
