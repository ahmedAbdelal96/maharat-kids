import "server-only";

import { type NotificationType, type OrderStatus } from "@prisma/client";
import { AppError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { UserId } from "@/modules/identity/types";
import { PrismaNotificationRepository, type NotificationRepository } from "../infrastructure/repository";
import type { CustomerNotification, CustomerNotificationPage, NotificationListInput } from "../types";

const orderNotificationTypes: Partial<Record<OrderStatus, NotificationType>> = {
  CONFIRMED: "ORDER_CONFIRMED",
  PROCESSING: "ORDER_PROCESSING",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  COMPLETED: "ORDER_COMPLETED",
  CANCELLED: "ORDER_CANCELLED",
};

const orderStatusLabels: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "confirmed",
  PROCESSING: "being prepared",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

function safeOrderHref(orderNumber: string) {
  const href = `/account/orders/${encodeURIComponent(orderNumber)}`;
  return href.startsWith("/") && !href.startsWith("//") ? href : null;
}

function serviceError(error: unknown) {
  return new AppError("NOTIFICATION_OPERATION_FAILED", "The notification could not be processed.", { cause: error });
}

export class NotificationService {
  constructor(private readonly repository: NotificationRepository = new PrismaNotificationRepository()) {}

  async getForUser(userId: UserId, input: NotificationListInput = {}): Promise<Result<CustomerNotificationPage, AppError>> {
    try {
      const [list, unreadCount] = await Promise.all([this.repository.findForUser(userId, input), this.repository.countUnread(userId)]);
      const page = Math.max(1, input.page ?? 1);
      const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
      return success({ items: list.items, page, pageSize, total: list.total, unreadCount, hasMore: page * pageSize < list.total });
    } catch (error) {
      return failure(serviceError(error));
    }
  }

  async getUnreadCount(userId: UserId): Promise<Result<number, AppError>> {
    try {
      return success(await this.repository.countUnread(userId));
    } catch (error) {
      return failure(serviceError(error));
    }
  }

  async markRead(userId: UserId, notificationId: string): Promise<Result<boolean, AppError>> {
    try {
      return success(await this.repository.markRead(userId, notificationId));
    } catch (error) {
      return failure(serviceError(error));
    }
  }

  async markAllRead(userId: UserId): Promise<Result<number, AppError>> {
    try {
      return success(await this.repository.markAllRead(userId));
    } catch (error) {
      return failure(serviceError(error));
    }
  }

  async createOrderStatusNotification(userId: UserId, orderId: string, orderNumber: string, status: OrderStatus): Promise<Result<CustomerNotification | null, AppError>> {
    const type = orderNotificationTypes[status];
    const label = orderStatusLabels[status];
    if (!type || !label) return success(null);
    return this.createSnapshot({
      userId,
      type,
      title: `Order #${orderNumber} update`,
      message: `Your order is ${label}.`,
      href: safeOrderHref(orderNumber),
      dedupeKey: `order:${orderId}:status:${status}`,
    });
  }

  async createPaymentNotification(userId: UserId, orderId: string, orderNumber: string, status: "PAID" | "FAILED"): Promise<Result<CustomerNotification, AppError>> {
    const isPaid = status === "PAID";
    return this.createSnapshot({
      userId,
      type: isPaid ? "PAYMENT_CONFIRMED" : "PAYMENT_REJECTED",
      title: `Payment ${isPaid ? "confirmed" : "needs attention"}`,
      message: isPaid ? `Payment for order #${orderNumber} was confirmed.` : `Payment for order #${orderNumber} was not approved.`,
      href: safeOrderHref(orderNumber),
      dedupeKey: `order:${orderId}:payment:${status}`,
    }) as Promise<Result<CustomerNotification, AppError>>;
  }

  async createReturnNotification(userId: UserId, returnId: string, returnNumber: string, status: "APPROVED" | "REJECTED" | "RECEIVED" | "REFUND_COMPLETED", note?: string): Promise<Result<CustomerNotification, AppError>> {
    const copy = {
      APPROVED: ["Return approved", `Return #${returnNumber} was approved.`],
      REJECTED: ["Return request update", `Return #${returnNumber} was not approved.`],
      RECEIVED: ["Return received", `We received the items for return #${returnNumber}.`],
      REFUND_COMPLETED: ["Refund completed", `Your refund for return #${returnNumber} was completed.`],
    } as const;
    const [title, message] = copy[status];
    return this.createSnapshot({ userId, type: status === "REFUND_COMPLETED" ? "REFUND_COMPLETED" : `RETURN_${status}` as NotificationType, title, message: note ? `${message} ${note}` : message, href: `/account/returns/${encodeURIComponent(returnId)}`, dedupeKey: `return:${returnId}:${status}` });
  }

  async createReviewNotification(userId: UserId, reviewId: string, productName: string, status: "APPROVED" | "REJECTED"): Promise<Result<CustomerNotification | null, AppError>> {
    return this.createSnapshot({
      userId,
      type: status === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
      title: status === "APPROVED" ? "Review published" : "Review needs attention",
      message: status === "APPROVED" ? `${productName} review is now published.` : `${productName} review was not approved.`,
      href: "/account/reviews",
      dedupeKey: `review:${reviewId}:${status}`,
    });
  }

  private async createSnapshot(input: { userId: UserId; type: NotificationType; title: string; message: string; href: string | null; dedupeKey: string }): Promise<Result<CustomerNotification, AppError>> {
    if (!input.href) return failure(new ValidationError("The notification link is invalid."));
    try {
      return success(await this.repository.create(input));
    } catch (error) {
      return failure(serviceError(error));
    }
  }
}

export function createNotificationService() {
  return new NotificationService();
}
