import "server-only";

import { Prisma, PrismaClient, type NotificationType } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { CustomerNotification, NotificationListInput } from "../types";

type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function toNotification(record: NotificationRecord): CustomerNotification {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    href: record.href,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  dedupeKey?: string | null;
};

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<CustomerNotification>;
  findForUser(userId: string, input: NotificationListInput): Promise<{ items: CustomerNotification[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(input: CreateNotificationInput) {
    if (input.dedupeKey) {
      const existing = await this.db.notification.findUnique({ where: { dedupeKey: input.dedupeKey } });
      if (existing) return toNotification(existing);
    }

    try {
      const record = await this.db.notification.create({ data: input });
      return toNotification(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && input.dedupeKey) {
        const existing = await this.db.notification.findUnique({ where: { dedupeKey: input.dedupeKey } });
        if (existing) return toNotification(existing);
      }
      throw error;
    }
  }

  async findForUser(userId: string, input: NotificationListInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    const where = { userId, ...(input.unreadOnly ? { readAt: null } : {}) };
    const [records, total] = await this.db.$transaction([
      this.db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.notification.count({ where }),
    ]);
    return { items: records.map(toNotification), total };
  }

  async countUnread(userId: string) {
    return this.db.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.db.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
    return result.count === 1;
  }

  async markAllRead(userId: string) {
    const result = await this.db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return result.count;
  }
}
