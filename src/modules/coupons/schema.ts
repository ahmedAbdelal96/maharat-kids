import { z } from "zod";

const code = z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, hyphens, or underscores.");
const decimal = z.coerce.number().finite().min(0);
const date = z.coerce.date();
const marketMoney = z.object({
  fixedDiscountAmount: decimal.nullable().optional(),
  minimumOrderSubtotal: decimal.default(0),
  maximumDiscountAmount: decimal.nullable().optional(),
});

export const couponTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);

const couponFields = z.object({
  name: z.string().trim().min(1).max(100),
  code,
  type: couponTypeSchema,
  percentageDiscount: decimal.nullable().optional(),
  fixedDiscountAmount: decimal.nullable().optional(),
  minimumOrderSubtotal: decimal.default(0),
  maximumDiscountAmount: decimal.nullable().optional(),
  marketRules: z.object({ SAUDI_ARABIA: marketMoney, EGYPT: marketMoney }),
  isActive: z.coerce.boolean().default(true),
  startsAt: date,
  endsAt: date.nullable().optional(),
  totalUsageLimit: z.coerce.number().int().min(1).nullable().optional(),
  perCustomerUsageLimit: z.coerce.number().int().min(1).nullable().optional(),
  canCombineWithPromotions: z.coerce.boolean().default(false),
});

export const createCouponSchema = couponFields.superRefine((input, ctx) => {
  if (input.endsAt && input.endsAt <= input.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after the start time." });
  if (input.type === "PERCENTAGE" && (!(input.percentageDiscount && input.percentageDiscount > 0) || input.percentageDiscount > 100)) ctx.addIssue({ code: "custom", path: ["percentageDiscount"], message: "Percentage must be greater than 0 and no more than 100." });
  for (const market of ["SAUDI_ARABIA", "EGYPT"] as const) {
    const rule = input.marketRules[market];
    if (input.type === "FIXED_AMOUNT" && !(rule.fixedDiscountAmount && rule.fixedDiscountAmount > 0)) ctx.addIssue({ code: "custom", path: ["marketRules", market, "fixedDiscountAmount"], message: "Fixed discount must be greater than 0." });
    if (input.type === "FIXED_AMOUNT" && rule.maximumDiscountAmount != null) ctx.addIssue({ code: "custom", path: ["marketRules", market, "maximumDiscountAmount"], message: "Maximum discount applies only to percentage coupons." });
  }
});

export const updateCouponSchema = couponFields.partial().extend({ id: z.string().trim().min(1) });
export const couponIdSchema = z.object({ id: z.string().trim().min(1) });
