import "server-only";

import { failure, success } from "@/core/result";
import { ForbiddenError } from "@/core/errors";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { ReviewService } from "../domain/service";
import type { AdminReviewFilters } from "../types";

function service() { return new ReviewService(); }

export async function getPublicProductReviews(productId: string, page = 1) { return service().publicReviews(productId, page); }

export async function getCustomerReviewEligibility(productId: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  if (actor.data.user.type !== "CUSTOMER") return success(null);
  return service().eligibility(actor.data.user.id, productId);
}

export async function getCustomerReviews() {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  if (actor.data.user.type !== "CUSTOMER") return failure(new ForbiddenError("Customer account required."));
  return service().customerReviews(actor.data.user.id);
}

export async function getAdminReviews(filters: AdminReviewFilters = {}) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return service().adminReviews(actor.data, filters);
}
