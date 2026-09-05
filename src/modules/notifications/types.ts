import type { NotificationType } from "@prisma/client";

export type CustomerNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CustomerNotificationPage = {
  items: CustomerNotification[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
  hasMore: boolean;
};

export type NotificationListInput = {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
};

export type StorefrontNotificationSummary = {
  unreadCount: number;
  notifications: CustomerNotification[];
};
