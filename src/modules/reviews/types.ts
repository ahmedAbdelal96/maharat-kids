import type { ReviewStatus } from "@prisma/client";

export type Review = {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  customerVisibleModerationReason: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  productName?: string;
  productSlug?: string;
  productImageUrl?: string | null;
  orderNumber?: string;
};

export type PublicReview = Omit<Review, "userId" | "orderItemId" | "orderNumber"> & {
  customerName: string;
  verifiedPurchase: true;
};

export type ReviewEligibility = {
  eligible: boolean;
  qualifyingOrderItemId: string | null;
  existingReview: Review | null;
  reason: "ELIGIBLE" | "NOT_CUSTOMER" | "NO_QUALIFYING_PURCHASE" | "FULLY_RETURNED" | "ALREADY_REVIEWED";
};

export type ReviewSummary = {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PublicReviewPage = {
  items: PublicReview[];
  summary: ReviewSummary;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ToReviewItem = {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  qualifyingOrderItemId: string;
  orderNumber: string;
};

export type CustomerReviewsPage = {
  toReview: ToReviewItem[];
  reviews: Review[];
};

export type AdminReview = Review & {
  customerEmail: string;
  customerName: string | null;
  orderNumber: string;
  orderStatus: string;
};

export type AdminReviewFilters = {
  status?: ReviewStatus;
  rating?: number;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminReviewsPage = {
  items: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<ReviewStatus, number>;
};
