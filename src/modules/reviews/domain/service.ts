import "server-only";

import { Prisma } from "@prisma/client";
import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { REVIEW_PERMISSIONS } from "../constants";
import type { AdminReviewFilters, AdminReviewsPage, CustomerReviewsPage, PublicReviewPage, Review, ReviewEligibility } from "../types";
import { PrismaReviewRepository, type ReviewRepository } from "../infrastructure/repository";

function operationError(cause: unknown) { return new AppError("REVIEW_OPERATION_FAILED", "The review request could not be completed.", { cause }); }

export class ReviewService {
  constructor(private readonly repository: ReviewRepository = new PrismaReviewRepository(), private readonly authorization: AuthorizationService = new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())) {}

  async eligibility(customerId: string, productId: string): Promise<Result<ReviewEligibility, AppError>> { try { return success(await this.repository.getEligibility(customerId, productId)); } catch (error) { return failure(operationError(error)); } }
  async publicReviews(productId: string, page?: number): Promise<Result<PublicReviewPage, AppError>> { try { return success(await this.repository.getPublic(productId, page)); } catch (error) { return failure(operationError(error)); } }
  async customerReviews(customerId: string): Promise<Result<CustomerReviewsPage, AppError>> { try { return success(await this.repository.getCustomerReviews(customerId)); } catch (error) { return failure(operationError(error)); } }

  async create(customer: AuthenticatedUser, productId: string, rating: number, comment: string | null): Promise<Result<Review, AppError>> {
    if (customer.user.type !== "CUSTOMER") return failure(new ForbiddenError("Only customer accounts can write product reviews."));
    try {
      const eligibility = await this.repository.getEligibility(customer.user.id, productId);
      if (!eligibility.eligible || !eligibility.qualifyingOrderItemId) return failure(new ForbiddenError("You can review this product after a delivered purchase."));
      return success(await this.repository.create(customer.user.id, productId, eligibility.qualifyingOrderItemId, rating, comment));
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(new AppError("REVIEW_ALREADY_EXISTS", "You have already reviewed this product.")); return failure(operationError(error)); }
  }

  async update(customer: AuthenticatedUser, reviewId: string, rating: number, comment: string | null): Promise<Result<Review, AppError>> {
    if (customer.user.type !== "CUSTOMER") return failure(new ForbiddenError("Only customer accounts can edit product reviews."));
    try { return success(await this.repository.updateCustomer(customer.user.id, reviewId, rating, comment)); } catch (error) { if (error instanceof Error && error.message === "REVIEW_NOT_FOUND") return failure(new NotFoundError("REVIEW", "Review does not exist.")); return failure(operationError(error)); }
  }

  async adminReviews(actor: AuthenticatedUser, filters?: AdminReviewFilters): Promise<Result<AdminReviewsPage, AppError>> { const access = await this.authorization.requirePermission(actor.user.id, REVIEW_PERMISSIONS.view); if (!access.success) return failure(access.error); try { return success(await this.repository.getAdmin(filters)); } catch (error) { return failure(operationError(error)); } }
  async moderate(actor: AuthenticatedUser, reviewId: string, status: "APPROVED" | "REJECTED", reason: string | null): Promise<Result<Review & { customerEmail: string; productName: string }, AppError>> { const access = await this.authorization.requirePermission(actor.user.id, REVIEW_PERMISSIONS.moderate); if (!access.success) return failure(access.error); try { return success(await this.repository.moderate(actor.user.id, reviewId, status, reason)); } catch (error) { if (error instanceof Error && error.message === "REVIEW_NOT_FOUND") return failure(new NotFoundError("REVIEW", "Review does not exist.")); return failure(operationError(error)); } }
}
