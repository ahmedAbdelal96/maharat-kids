import "server-only";

import { Prisma, PrismaClient, type ReviewStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { AdminReviewFilters, AdminReviewsPage, CustomerReviewsPage, PublicReview, PublicReviewPage, Review, ReviewEligibility, ToReviewItem } from "../types";

const paidStatuses = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
const qualifyingOrderStatuses = ["DELIVERED", "COMPLETED"] as const;
const activeReturnStatuses = ["APPROVED", "RETURNING", "RECEIVED", "COMPLETED"] as const;

function imageUrl(images: Array<{ url: string | null; media: { url: string } | null }>) {
  return images[0]?.media?.url ?? images[0]?.url ?? null;
}

function toReview(record: { id: string; userId: string; productId: string; orderItemId: string; rating: number; comment: string | null; status: ReviewStatus; customerVisibleModerationReason: string | null; moderatedAt: Date | null; createdAt: Date; updatedAt: Date; product?: { name: string; slug: string; images: Array<{ url: string | null; media: { url: string } | null }> } | null; orderItem?: { order: { orderNumber: string; status?: string } } | null }): Review {
  return {
    id: record.id, userId: record.userId, productId: record.productId, orderItemId: record.orderItemId,
    rating: record.rating, comment: record.comment, status: record.status,
    customerVisibleModerationReason: record.customerVisibleModerationReason,
    moderatedAt: record.moderatedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    productName: record.product?.name, productSlug: record.product?.slug,
    productImageUrl: record.product ? imageUrl(record.product.images) : null,
    orderNumber: record.orderItem?.order.orderNumber,
  };
}

function returnedQuantity(items: Array<{ receivedQuantity: number; returnRequest: { status: typeof activeReturnStatuses[number] | string } }>) {
  return items.filter((item) => activeReturnStatuses.includes(item.returnRequest.status as typeof activeReturnStatuses[number])).reduce((sum, item) => sum + item.receivedQuantity, 0);
}

function toPublicReview(record: Parameters<typeof toReview>[0], customerName: string): PublicReview {
  const review = toReview(record);
  return {
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    customerVisibleModerationReason: review.customerVisibleModerationReason,
    moderatedAt: review.moderatedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    productName: review.productName,
    productSlug: review.productSlug,
    productImageUrl: review.productImageUrl,
    customerName,
    verifiedPurchase: true,
  };
}

export interface ReviewRepository {
  getEligibility(customerId: string, productId: string): Promise<ReviewEligibility>;
  getCustomerReviews(customerId: string): Promise<CustomerReviewsPage>;
  create(customerId: string, productId: string, orderItemId: string, rating: number, comment: string | null): Promise<Review>;
  updateCustomer(customerId: string, reviewId: string, rating: number, comment: string | null): Promise<Review>;
  getPublic(productId: string, page?: number, pageSize?: number): Promise<PublicReviewPage>;
  getAdmin(filters?: AdminReviewFilters): Promise<AdminReviewsPage>;
  moderate(actorId: string, reviewId: string, status: "APPROVED" | "REJECTED", reason: string | null): Promise<Review & { customerEmail: string; productName: string }>;
}

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private readonly productInclude = { images: { orderBy: { isPrimary: "desc" as const }, take: 1, include: { media: { select: { url: true } } } } };

  async getEligibility(customerId: string, productId: string): Promise<ReviewEligibility> {
    const [user, existing, items] = await Promise.all([
      this.db.user.findUnique({ where: { id: customerId }, select: { type: true } }),
      this.db.productReview.findUnique({ where: { userId_productId: { userId: customerId, productId } }, include: { product: { include: this.productInclude }, orderItem: { include: { order: { select: { orderNumber: true } } } } } }),
      this.db.orderItem.findMany({
        where: { productId, isPromotionGift: false, order: { customerId, status: { in: [...qualifyingOrderStatuses] }, paymentStatus: { in: [...paidStatuses] } } },
        include: { returnItems: { include: { returnRequest: { select: { status: true } } } }, order: { select: { orderNumber: true } } },
      }),
    ]);
    const existingReview = existing ? toReview(existing) : null;
    if (!user || user.type !== "CUSTOMER") return { eligible: false, qualifyingOrderItemId: null, existingReview, reason: "NOT_CUSTOMER" };
    if (existingReview) return { eligible: false, qualifyingOrderItemId: null, existingReview, reason: "ALREADY_REVIEWED" };
    const qualifying = items.find((item) => item.quantity - returnedQuantity(item.returnItems) > 0);
    if (qualifying) return { eligible: true, qualifyingOrderItemId: qualifying.id, existingReview: null, reason: "ELIGIBLE" };
    return { eligible: false, qualifyingOrderItemId: null, existingReview: null, reason: items.length > 0 ? "FULLY_RETURNED" : "NO_QUALIFYING_PURCHASE" };
  }

  async getCustomerReviews(customerId: string): Promise<CustomerReviewsPage> {
    const [items, reviews] = await Promise.all([
      this.db.orderItem.findMany({
        where: { isPromotionGift: false, order: { customerId, status: { in: [...qualifyingOrderStatuses] }, paymentStatus: { in: [...paidStatuses] } } },
        include: { order: { select: { orderNumber: true } }, returnItems: { include: { returnRequest: { select: { status: true } } } }, reviews: { where: { userId: customerId }, take: 1 } },
      }),
      this.db.productReview.findMany({ where: { userId: customerId }, include: { product: { include: this.productInclude }, orderItem: { include: { order: { select: { orderNumber: true } } } } }, orderBy: { updatedAt: "desc" } }),
    ]);
    const products = await this.db.product.findMany({ where: { id: { in: [...new Set(items.map((item) => item.productId))] } }, include: this.productInclude });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const seen = new Set<string>();
    const toReviewItems: ToReviewItem[] = [];
    for (const item of items) {
      const remaining = item.quantity - returnedQuantity(item.returnItems);
      const product = productMap.get(item.productId);
      if (remaining < 1 || !product || item.reviews.length > 0 || seen.has(item.productId)) continue;
      seen.add(item.productId);
      toReviewItems.push({ productId: item.productId, productName: product.name, productSlug: product.slug, imageUrl: imageUrl(product.images), qualifyingOrderItemId: item.id, orderNumber: item.order.orderNumber });
    }
    return { toReview: toReviewItems, reviews: reviews.map((review) => toReview(review)) };
  }

  async create(customerId: string, productId: string, orderItemId: string, rating: number, comment: string | null) {
    const record = await this.db.productReview.create({ data: { userId: customerId, productId, orderItemId, rating, comment }, include: { product: { include: this.productInclude }, orderItem: { include: { order: { select: { orderNumber: true } } } } } });
    return toReview(record);
  }

  async updateCustomer(customerId: string, reviewId: string, rating: number, comment: string | null) {
    const record = await this.db.productReview.updateMany({ where: { id: reviewId, userId: customerId }, data: { rating, comment, status: "PENDING", customerVisibleModerationReason: null, moderatedByUserId: null, moderatedAt: null } });
    if (record.count === 0) throw new Error("REVIEW_NOT_FOUND");
    return toReview(await this.db.productReview.findUniqueOrThrow({ where: { id: reviewId }, include: { product: { include: this.productInclude }, orderItem: { include: { order: { select: { orderNumber: true } } } } } }));
  }

  async getPublic(productId: string, page = 1, pageSize = 10): Promise<PublicReviewPage> {
    const where = { productId, status: "APPROVED" as const };
    const [total, records, grouped] = await Promise.all([
      this.db.productReview.count({ where }),
      this.db.productReview.findMany({ where, include: { product: { include: this.productInclude }, user: { select: { name: true, email: true } }, orderItem: { include: { order: { select: { orderNumber: true } } } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.productReview.groupBy({ by: ["rating"], where, _count: { _all: true }, _avg: { rating: true } }),
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    for (const row of grouped) if (row.rating >= 1 && row.rating <= 5) distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
    const count = grouped.reduce((sum, row) => sum + row._count._all, 0);
    const average = count ? grouped.reduce((sum, row) => sum + (row._avg.rating ?? 0) * row._count._all, 0) / count : 0;
    return { items: records.map((record) => toPublicReview(record, record.user.name?.trim() || record.user.email.split("@")[0] || "Verified customer")), summary: { average: Math.round(average * 10) / 10, count, distribution }, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getAdmin(filters: AdminReviewFilters = {}): Promise<AdminReviewsPage> {
    const page = Math.max(1, filters.page ?? 1); const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
    const search = filters.search?.trim();
    const where: Prisma.ProductReviewWhereInput = { ...(filters.status ? { status: filters.status } : {}), ...(filters.rating ? { rating: filters.rating } : {}), ...(search ? { OR: [{ comment: { contains: search, mode: "insensitive" } }, { product: { name: { contains: search, mode: "insensitive" } } }, { user: { email: { contains: search, mode: "insensitive" } } }, { orderItem: { order: { orderNumber: { contains: search, mode: "insensitive" } } } }] } : {}) };
    const [total, records, pending, approved, rejected] = await Promise.all([
      this.db.productReview.count({ where }),
      this.db.productReview.findMany({ where, include: { product: { include: this.productInclude }, user: { select: { email: true, name: true } }, orderItem: { include: { order: { select: { orderNumber: true, status: true } } } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.productReview.count({ where: { status: "PENDING" } }), this.db.productReview.count({ where: { status: "APPROVED" } }), this.db.productReview.count({ where: { status: "REJECTED" } }),
    ]);
    return { items: records.map((record) => ({ ...toReview(record), customerEmail: record.user.email, customerName: record.user.name, orderNumber: record.orderItem.order.orderNumber, orderStatus: record.orderItem.order.status })), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), counts: { PENDING: pending, APPROVED: approved, REJECTED: rejected } };
  }

  async moderate(actorId: string, reviewId: string, status: "APPROVED" | "REJECTED", reason: string | null) {
    const existing = await this.db.productReview.findUnique({ where: { id: reviewId }, include: { product: { select: { name: true } }, user: { select: { email: true } } } });
    if (!existing) throw new Error("REVIEW_NOT_FOUND");
    const record = await this.db.productReview.update({ where: { id: reviewId }, data: { status, customerVisibleModerationReason: status === "REJECTED" ? reason : null, moderatedByUserId: actorId, moderatedAt: new Date() }, include: { product: { include: this.productInclude }, orderItem: { include: { order: { select: { orderNumber: true } } } } } });
    return { ...toReview(record), customerEmail: existing.user.email, productName: existing.product.name };
  }
}
