'use server';

import "server-only";
import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import type { UserId } from "@/modules/identity/types";
import { createNotificationService } from "@/modules/notifications/domain/service";
import { createReviewSchema, moderateReviewSchema, updateReviewSchema } from "../schema";
import { ReviewService } from "../domain/service";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function service() { return new ReviewService(); }

export async function createProductReview(input: unknown) {
  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a rating and review the comment."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const result = await service().create(actor.data, parsed.data.productId, parsed.data.rating, parsed.data.comment?.trim() || null);
  if (result.success) { revalidatePath(`/products/${result.data.productSlug ?? ""}`); revalidatePath("/account/reviews"); }
  return result;
}

export async function updateProductReview(input: unknown) {
  const parsed = updateReviewSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a rating and review the comment."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const result = await service().update(actor.data, parsed.data.reviewId, parsed.data.rating, parsed.data.comment?.trim() || null);
  if (result.success) { revalidatePath("/account/reviews"); if (result.data.productSlug) revalidatePath(`/products/${result.data.productSlug}`); }
  return result;
}

export async function moderateProductReview(input: unknown) {
  const parsed = moderateReviewSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError(parsed.error.issues[0]?.message ?? "Please review the moderation details."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const result = await service().moderate(actor.data, parsed.data.reviewId, parsed.data.status, parsed.data.reason?.trim() || null);
  if (result.success) {
    await writeAdminAudit(actor.data, { action: parsed.data.status === "APPROVED" ? AUDIT_ACTIONS.REVIEW_APPROVED : AUDIT_ACTIONS.REVIEW_REJECTED, entityType: AUDIT_ENTITY_TYPES.REVIEW, entityId: result.data.id, entityLabel: `Review for ${result.data.productName}`, metadata: { rating: result.data.rating } });
    await createNotificationService().createReviewNotification(result.data.userId as UserId, result.data.id, result.data.productName, parsed.data.status);
    revalidatePath("/admin/reviews");
    if (result.data.productSlug) revalidatePath(`/products/${result.data.productSlug}`);
    revalidatePath("/account/reviews");
  }
  return result;
}
