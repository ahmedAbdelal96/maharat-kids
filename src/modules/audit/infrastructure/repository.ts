import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { AuditActorOption, AuditLogFilters, AuditLogItem, AuditLogPage, AuditRecordInput } from "../types";

export interface AuditLogRepository {
  create(input: AuditRecordInput): Promise<AuditLogItem>;
  createInTransaction(tx: Prisma.TransactionClient, input: AuditRecordInput): Promise<AuditLogItem>;
  findPage(filters: AuditLogFilters): Promise<AuditLogPage>;
}

function toItem(record: Prisma.AuditLogGetPayload<Prisma.AuditLogDefaultArgs>): AuditLogItem {
  return {
    id: record.id,
    actor: { userId: record.actorUserId, name: record.actorNameSnapshot, email: record.actorEmailSnapshot ?? "" },
    action: record.action as AuditRecordInput["action"],
    entityType: record.entityType as AuditRecordInput["entityType"],
    entityId: record.entityId,
    entityLabel: record.entityLabel,
    changes: record.changes as AuditLogItem["changes"],
    metadata: record.metadata as AuditLogItem["metadata"],
    requestId: record.requestId,
    createdAt: record.createdAt.toISOString(),
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private async createWithClient(client: PrismaClient | Prisma.TransactionClient, input: AuditRecordInput): Promise<AuditLogItem> {
    const record = await client.auditLog.create({
      data: {
        actorUserId: input.actor.userId,
        actorNameSnapshot: input.actor.name ?? input.actor.email,
        actorEmailSnapshot: input.actor.email,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel,
        changes: input.changes ? input.changes as Prisma.InputJsonValue : undefined,
        metadata: input.metadata ? input.metadata as Prisma.InputJsonValue : undefined,
        requestId: input.requestId ?? null,
      },
    });
    return toItem(record);
  }

  async create(input: AuditRecordInput): Promise<AuditLogItem> {
    return this.createWithClient(this.db, input);
  }

  async createInTransaction(tx: Prisma.TransactionClient, input: AuditRecordInput): Promise<AuditLogItem> {
    return this.createWithClient(tx, input);
  }

  async findPage(filters: AuditLogFilters): Promise<AuditLogPage> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 30, 50);
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
      ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
      ...(filters.search ? { OR: [{ actorNameSnapshot: { contains: filters.search, mode: "insensitive" } }, { actorEmailSnapshot: { contains: filters.search, mode: "insensitive" } }, { entityLabel: { contains: filters.search, mode: "insensitive" } }, { action: { contains: filters.search, mode: "insensitive" } }] } : {}),
    };
    const [total, records] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const actorRecords = await this.db.auditLog.findMany({
      where: { actorUserId: { not: null } },
      select: { actorUserId: true, actorNameSnapshot: true, actorEmailSnapshot: true },
      distinct: ["actorUserId"],
      orderBy: { actorNameSnapshot: "asc" },
    });
    const actors: AuditActorOption[] = actorRecords.flatMap((record) => record.actorUserId ? [{ userId: record.actorUserId, name: record.actorNameSnapshot, email: record.actorEmailSnapshot ?? "" }] : []);
    return { items: records.map(toItem), actors, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
