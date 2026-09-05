import "server-only";

import { PrismaClient, type PasswordResetCode as PrismaPasswordResetCode } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";

export type PasswordResetCodeRecord = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  verifiedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
};

export interface PasswordResetRepository {
  invalidateActive(userId: string, now: Date): Promise<void>;
  findLatest(userId: string): Promise<PasswordResetCodeRecord | null>;
  create(input: { userId: string; codeHash: string; expiresAt: Date }): Promise<PasswordResetCodeRecord>;
  incrementAttempt(id: string): Promise<PasswordResetCodeRecord>;
  markVerified(id: string): Promise<PasswordResetCodeRecord>;
  markUsed(id: string): Promise<void>;
  findById(id: string): Promise<PasswordResetCodeRecord | null>;
}

function toRecord(record: PrismaPasswordResetCode): PasswordResetCodeRecord {
  return record;
}

export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async invalidateActive(userId: string, now: Date): Promise<void> {
    await this.db.passwordResetCode.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
  }

  async findLatest(userId: string): Promise<PasswordResetCodeRecord | null> {
    const record = await this.db.passwordResetCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return record ? toRecord(record) : null;
  }

  async create(input: { userId: string; codeHash: string; expiresAt: Date }): Promise<PasswordResetCodeRecord> {
    return toRecord(await this.db.passwordResetCode.create({ data: input }));
  }

  async incrementAttempt(id: string): Promise<PasswordResetCodeRecord> {
    return toRecord(await this.db.passwordResetCode.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    }));
  }

  async markVerified(id: string): Promise<PasswordResetCodeRecord> {
    return toRecord(await this.db.passwordResetCode.update({
      where: { id },
      data: { verifiedAt: new Date() },
    }));
  }

  async markUsed(id: string): Promise<void> {
    await this.db.passwordResetCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async findById(id: string): Promise<PasswordResetCodeRecord | null> {
    const record = await this.db.passwordResetCode.findUnique({ where: { id } });
    return record ? toRecord(record) : null;
  }
}
