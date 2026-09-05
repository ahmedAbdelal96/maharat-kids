import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1500).optional().nullable(),
});

export const updateReviewSchema = createReviewSchema.extend({
  reviewId: z.string().trim().min(1),
});

export const moderateReviewSchema = z.object({
  reviewId: z.string().trim().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, context) => {
  if (value.status === "REJECTED" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A customer-visible reason is required when rejecting a review." });
  }
});
