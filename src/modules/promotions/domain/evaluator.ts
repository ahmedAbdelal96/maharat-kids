import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type {
  AppliedPromotionBenefit,
  EvaluationCartItem,
  GiftLineItem,
  PromotionEvaluationResult,
  PromotionRuleSnapshot,
} from "../types";
import { isPromotionCurrentlyActive } from "./status";
import type { Market } from "@prisma/client";

type PrismaClientOrTx = Prisma.TransactionClient | ReturnType<typeof getPrismaClient>;

export async function evaluatePromotions({
  market,
  items,
  now = new Date(),
  tx,
}: {
  market: Market;
  items: EvaluationCartItem[];
  now?: Date;
  tx?: PrismaClientOrTx;
}): Promise<PromotionEvaluationResult> {
  const db = tx ?? getPrismaClient();

  if (!items || items.length === 0) {
    return {
      appliedPromotion: null,
      discountAmount: "0.00",
      giftItems: [],
      eligiblePromotions: [],
      progressHint: null,
    };
  }

  // Query all potentially active promotions
  const candidateRecords = await db.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: {
      marketRules: { where: { market } },
      qualifyingProduct: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          status: true,
          trackInventory: true,
          stockQuantity: true,
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
          marketPrices: { where: { market }, select: { price: true } },
        },
      },
      giftProduct: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          status: true,
          trackInventory: true,
          stockQuantity: true,
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
          marketPrices: { where: { market }, select: { price: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Calculate merchandise subtotal based on current unit prices
  let subtotal = new Prisma.Decimal(0);
  const quantityByProductId = new Map<string, number>();

  for (const item of items) {
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    subtotal = subtotal.add(unitPrice.mul(item.quantity));
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

  type CandidateEvaluation = {
    promotion: (typeof candidateRecords)[number];
    benefitAmount: Prisma.Decimal;
    benefitDescription: string;
    ruleSnapshot: PromotionRuleSnapshot;
    giftItems: GiftLineItem[];
    priority: number;
    createdAt: Date;
  };

  const eligibleCandidates: CandidateEvaluation[] = [];
  const progressHints: Array<{ diffAmount: number; message: string }> = [];

  for (const promo of candidateRecords) {
    if (!isPromotionCurrentlyActive(promo, now)) continue;

    const marketRule = promo.marketRules[0];
    if ((promo.type === "ORDER_PERCENTAGE_DISCOUNT" || promo.type === "ORDER_FIXED_DISCOUNT") && !marketRule) continue;

    if (promo.type === "ORDER_PERCENTAGE_DISCOUNT") {
      const minSpend = marketRule?.minimumOrderSubtotal ? new Prisma.Decimal(marketRule.minimumOrderSubtotal) : new Prisma.Decimal(0);
      const percentage = promo.percentageDiscount ? new Prisma.Decimal(promo.percentageDiscount) : new Prisma.Decimal(0);

      if (percentage.gt(0)) {
        if (subtotal.gte(minSpend)) {
          const discount = subtotal.mul(percentage).div(100);
          const benefit = discount.gt(subtotal) ? subtotal : discount;
          eligibleCandidates.push({
            promotion: promo,
            benefitAmount: benefit,
            benefitDescription: `Save ${percentage.toFixed(0)}% on your order`,
            ruleSnapshot: {
              minimumOrderSubtotal: minSpend.toFixed(2),
              percentageDiscount: percentage.toFixed(2),
              benefitDescription: `Save ${percentage.toFixed(0)}% on orders over $${minSpend.toFixed(2)}`,
            },
            giftItems: [],
            priority: promo.priority,
            createdAt: promo.createdAt,
          });
        } else {
          const diff = minSpend.sub(subtotal).toNumber();
          if (diff > 0) {
            progressHints.push({
              diffAmount: diff,
              message: `Add $${diff.toFixed(2)} more to unlock ${percentage.toFixed(0)}% off your order.`,
            });
          }
        }
      }
    } else if (promo.type === "ORDER_FIXED_DISCOUNT") {
      const minSpend = marketRule?.minimumOrderSubtotal ? new Prisma.Decimal(marketRule.minimumOrderSubtotal) : new Prisma.Decimal(0);
      const fixedAmount = marketRule?.fixedDiscountAmount ? new Prisma.Decimal(marketRule.fixedDiscountAmount) : new Prisma.Decimal(0);

      if (fixedAmount.gt(0)) {
        if (subtotal.gte(minSpend)) {
          const benefit = fixedAmount.gt(subtotal) ? subtotal : fixedAmount;
          eligibleCandidates.push({
            promotion: promo,
            benefitAmount: benefit,
            benefitDescription: `Save $${fixedAmount.toFixed(2)} on your order`,
            ruleSnapshot: {
              minimumOrderSubtotal: minSpend.toFixed(2),
              fixedDiscountAmount: fixedAmount.toFixed(2),
              benefitDescription: `Save $${fixedAmount.toFixed(2)} on orders over $${minSpend.toFixed(2)}`,
            },
            giftItems: [],
            priority: promo.priority,
            createdAt: promo.createdAt,
          });
        } else {
          const diff = minSpend.sub(subtotal).toNumber();
          if (diff > 0) {
            progressHints.push({
              diffAmount: diff,
              message: `Add $${diff.toFixed(2)} more to save $${fixedAmount.toFixed(2)}.`,
            });
          }
        }
      }
    } else if (promo.type === "BUY_X_GET_Y_FREE") {
      if (
        promo.qualifyingProductId &&
        promo.buyQuantity &&
        promo.buyQuantity > 0 &&
        promo.giftProductId &&
        promo.giftQuantity &&
        promo.giftQuantity > 0 &&
        promo.giftProduct
      ) {
        const qualifyingQty = quantityByProductId.get(promo.qualifyingProductId) ?? 0;
        const buyQty = promo.buyQuantity;
        const giftQtyPerSet = promo.giftQuantity;

        if (qualifyingQty >= buyQty) {
          const multiplier = Math.floor(qualifyingQty / buyQty);
          const totalGiftUnits = multiplier * giftQtyPerSet;

          // Verify gift product availability
          const giftProduct = promo.giftProduct;
          let stockAvailable = true;

          if (giftProduct.status !== "ACTIVE") {
            stockAvailable = false;
          } else if (giftProduct.trackInventory) {
            // If the customer also purchased paid units of the same gift product in cart
            const paidGiftQtyInCart = quantityByProductId.get(giftProduct.id) ?? 0;
            const totalStockNeeded = paidGiftQtyInCart + totalGiftUnits;
            if (giftProduct.stockQuantity < totalStockNeeded) {
              stockAvailable = false;
            }
          }

          if (stockAvailable && totalGiftUnits > 0) {
            const giftPrice = giftProduct.marketPrices[0]?.price;
            if (!giftPrice) continue;
            const giftUnitPrice = new Prisma.Decimal(giftPrice);
            const benefit = giftUnitPrice.mul(totalGiftUnits);

            const giftLine: GiftLineItem = {
              productId: giftProduct.id,
              name: giftProduct.name,
              imageUrl: giftProduct.images[0]?.url ?? null,
              unitPrice: "0.00",
              originalPrice: giftUnitPrice.toFixed(2),
              quantity: totalGiftUnits,
              promotionId: promo.id,
              promotionName: promo.name,
              trackInventory: giftProduct.trackInventory,
            };

            eligibleCandidates.push({
              promotion: promo,
              benefitAmount: benefit,
              benefitDescription: `Buy ${buyQty} Get ${giftQtyPerSet} Free`,
              ruleSnapshot: {
                qualifyingProductId: promo.qualifyingProductId,
                qualifyingProductName: promo.qualifyingProduct?.name ?? "Qualifying Product",
                buyQuantity: promo.buyQuantity,
                giftProductId: promo.giftProductId,
                giftProductName: promo.giftProduct.name,
                giftQuantity: promo.giftQuantity,
                benefitDescription: `Buy ${buyQty} ${promo.qualifyingProduct?.name ?? "item(s)"}, Get ${giftQtyPerSet} ${promo.giftProduct.name} Free`,
              },
              giftItems: [giftLine],
              priority: promo.priority,
              createdAt: promo.createdAt,
            });
          }
        } else if (qualifyingQty > 0) {
          const remainingToBuy = buyQty - qualifyingQty;
          progressHints.push({
            diffAmount: remainingToBuy,
            message: `Add ${remainingToBuy} more ${promo.qualifyingProduct?.name ?? "qualifying item(s)"} to get ${giftQtyPerSet} ${promo.giftProduct.name} free!`,
          });
        }
      }
    }
  }

  // Sort eligible candidates to find the BEST offer for the customer:
  // 1. Highest monetary benefit
  // 2. Highest priority
  // 3. Earliest createdAt
  eligibleCandidates.sort((a, b) => {
    if (b.benefitAmount.cmp(a.benefitAmount) !== 0) {
      return b.benefitAmount.cmp(a.benefitAmount);
    }
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const best = eligibleCandidates[0] ?? null;

  // Find most relevant progress hint
  progressHints.sort((a, b) => a.diffAmount - b.diffAmount);
  const progressHint = progressHints[0]?.message ?? null;

  if (!best || best.benefitAmount.lte(0)) {
    return {
      appliedPromotion: null,
      discountAmount: "0.00",
      giftItems: [],
      eligiblePromotions: [],
      progressHint,
    };
  }

  const appliedBenefit: AppliedPromotionBenefit = {
    promotionId: best.promotion.id,
    promotionName: best.promotion.name,
    promotionSlug: best.promotion.slug,
    promotionType: best.promotion.type,
    discountAmount: best.benefitAmount.toFixed(2),
    benefitDescription: best.benefitDescription,
    ruleSnapshot: best.ruleSnapshot,
    giftItems: best.giftItems,
  };

  return {
    appliedPromotion: appliedBenefit,
    discountAmount: best.benefitAmount.toFixed(2),
    giftItems: best.giftItems,
    eligiblePromotions: eligibleCandidates.map((c) => ({
      promotionId: c.promotion.id,
      promotionName: c.promotion.name,
      promotionType: c.promotion.type,
      benefitAmount: c.benefitAmount.toFixed(2),
    })),
    progressHint,
  };
}
