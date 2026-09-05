import "server-only";

import type { Prisma } from "@prisma/client";
import { AppError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { PrismaAuditLogRepository } from "../infrastructure/repository";
import { sanitizeAuditChanges, sanitizeAuditMetadata } from "./sanitizer";
import type { AuditLogFilters, AuditLogItem, AuditLogPage, AuditRecordInput } from "../types";
import type { AuditLogRepository } from "../infrastructure/repository";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async record(input: AuditRecordInput): Promise<Result<AuditLogItem, AppError>> {
    try {
      return success(await this.repository.create({ ...input, changes: sanitizeAuditChanges(input.changes), metadata: sanitizeAuditMetadata(input.metadata) }));
    } catch (error) {
      return failure(new AppError("AUDIT_WRITE_FAILED", "The activity record could not be saved.", { cause: error }));
    }
  }

  async recordInTransaction(tx: Prisma.TransactionClient, input: AuditRecordInput): Promise<Result<AuditLogItem, AppError>> {
    try {
      return success(await this.repository.createInTransaction(tx, { ...input, changes: sanitizeAuditChanges(input.changes), metadata: sanitizeAuditMetadata(input.metadata) }));
    } catch (error) {
      return failure(new AppError("AUDIT_WRITE_FAILED", "The activity record could not be saved.", { cause: error }));
    }
  }

  async list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AppError>> {
    try {
      return success(await this.repository.findPage(filters));
    } catch (error) {
      return failure(new AppError("AUDIT_QUERY_FAILED", "The activity log is unavailable.", { cause: error }));
    }
  }
}

export function createAuditLogService() {
  return new AuditLogService(new PrismaAuditLogRepository());
}
