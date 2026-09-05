import { Prisma } from "@prisma/client";

/** Calculates merchandise refunds from immutable order snapshots. */
export class RefundCalculator {
  static lineRefund(input: {
    unitPrice: Prisma.Decimal;
    quantity: number;
    promotionDiscount: Prisma.Decimal;
    couponDiscount?: Prisma.Decimal;
    paidGross: Prisma.Decimal;
    isPromotionGift: boolean;
  }): Prisma.Decimal {
    if (input.isPromotionGift || input.quantity < 1) return new Prisma.Decimal(0);

    const gross = input.unitPrice.mul(input.quantity);
    const totalDiscount = input.promotionDiscount.add(input.couponDiscount ?? new Prisma.Decimal(0));
    const allocatedDiscount = input.paidGross.gt(0)
      ? totalDiscount.mul(gross).div(input.paidGross)
      : new Prisma.Decimal(0);
    const refund = gross.sub(allocatedDiscount);

    return refund.gt(0) ? refund.toDecimalPlaces(2) : new Prisma.Decimal(0);
  }
}
