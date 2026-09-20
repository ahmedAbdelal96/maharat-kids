import { z } from "zod";
import { promotionTypes } from "./constants";

export const promotionTypeSchema = z.enum(promotionTypes);
const marketMoney = z.object({ minimumOrderSubtotal: z.coerce.number().min(0).nullable().optional(), fixedDiscountAmount: z.coerce.number().min(0.01).nullable().optional() });

export const createPromotionSchema = z
  .object({
    name: z.string().trim().min(1, "Offer name is required.").max(100, "Offer name must be 100 characters or less."),
    shortDescription: z.string().trim().min(1, "Short commercial benefit is required.").max(255, "Short benefit must be 255 characters or less."),
    description: z.string().trim().max(2000).optional().nullable(),
    type: promotionTypeSchema,
    isActive: z.boolean().default(true),
    showInHero: z.boolean().default(false),
    showOnOffersPage: z.boolean().default(true),
    bannerMediaId: z.string().trim().nullable().optional(),
    priority: z.coerce.number().int().min(0).default(0),
    startsAt: z.coerce.date().default(() => new Date()),
    endsAt: z.coerce.date().nullable().optional(),

    minimumOrderSubtotal: z.coerce.number().min(0, "Minimum spend must be 0 or greater.").nullable().optional(),
    percentageDiscount: z.coerce.number().min(0.01, "Discount percentage must be greater than 0.").max(100, "Discount percentage cannot exceed 100%.").nullable().optional(),
    fixedDiscountAmount: z.coerce.number().min(0.01, "Fixed discount amount must be greater than 0.").nullable().optional(),
    marketRules: z.object({ SAUDI_ARABIA: marketMoney, EGYPT: marketMoney }),

    qualifyingProductId: z.string().trim().nullable().optional(),
    buyQuantity: z.coerce.number().int().min(1, "Buy quantity must be at least 1.").nullable().optional(),
    giftProductId: z.string().trim().nullable().optional(),
    giftQuantity: z.coerce.number().int().min(1, "Gift quantity must be at least 1.").nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endsAt && data.endsAt.getTime() <= data.startsAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date.",
        path: ["endsAt"],
      });
    }

    if (data.type === "ORDER_PERCENTAGE_DISCOUNT") {
      if (data.percentageDiscount == null || data.percentageDiscount <= 0 || data.percentageDiscount > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage discount between 1% and 100% is required for this offer type.",
          path: ["percentageDiscount"],
        });
      }
    }

    if (data.type === "ORDER_FIXED_DISCOUNT") {
      for (const market of ["SAUDI_ARABIA", "EGYPT"] as const) if (data.marketRules[market].fixedDiscountAmount == null || data.marketRules[market].fixedDiscountAmount <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fixed discount amount greater than 0 is required for each market.", path: ["marketRules", market, "fixedDiscountAmount"] });
    }

    if (data.type === "BUY_X_GET_Y_FREE") {
      if (!data.qualifyingProductId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qualifying product is required for Buy X Get Y offers.",
          path: ["qualifyingProductId"],
        });
      }
      if (!data.buyQuantity || data.buyQuantity < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Buy quantity must be at least 1.",
          path: ["buyQuantity"],
        });
      }
      if (!data.giftProductId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Gift product is required for Buy X Get Y offers.",
          path: ["giftProductId"],
        });
      }
      if (!data.giftQuantity || data.giftQuantity < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Gift quantity must be at least 1.",
          path: ["giftQuantity"],
        });
      }
    }
  });

export const updatePromotionSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1, "Offer name is required.").max(100).optional(),
    shortDescription: z.string().trim().min(1, "Short commercial benefit is required.").max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    type: promotionTypeSchema.optional(),
    isActive: z.boolean().optional(),
    showInHero: z.boolean().optional(),
    showOnOffersPage: z.boolean().optional(),
    bannerMediaId: z.string().trim().nullable().optional(),
    priority: z.coerce.number().int().min(0).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().nullable().optional(),

    minimumOrderSubtotal: z.coerce.number().min(0).nullable().optional(),
    percentageDiscount: z.coerce.number().min(0.01).max(100).nullable().optional(),
    fixedDiscountAmount: z.coerce.number().min(0.01).nullable().optional(),
    marketRules: z.object({ SAUDI_ARABIA: marketMoney, EGYPT: marketMoney }).optional(),

    qualifyingProductId: z.string().trim().nullable().optional(),
    buyQuantity: z.coerce.number().int().min(1).nullable().optional(),
    giftProductId: z.string().trim().nullable().optional(),
    giftQuantity: z.coerce.number().int().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && data.endsAt.getTime() <= data.startsAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date.",
        path: ["endsAt"],
      });
    }
  });

export const promotionQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE", "ALL"]).default("ALL"),
  heroOnly: z.boolean().optional(),
  offersPageOnly: z.boolean().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
