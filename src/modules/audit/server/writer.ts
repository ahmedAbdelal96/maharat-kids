import "server-only";

import type { AuthenticatedUser } from "@/modules/auth/types";
import { logger } from "@/server/logger";
import { AuditLogService } from "../domain/service";
import { PrismaAuditLogRepository } from "../infrastructure/repository";
import type { AuditAction, AuditEntityType } from "../constants";
import type { AuditChanges, AuditMetadata } from "../types";

const auditService = new AuditLogService(new PrismaAuditLogRepository());

/**
 * Records a successful admin mutation using the authenticated actor snapshot.
 * This helper intentionally accepts no actor identity from client input.
 */
export async function writeAdminAudit(
  actor: AuthenticatedUser,
  input: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    entityLabel: string;
    changes?: AuditChanges | null;
    metadata?: AuditMetadata | null;
    requestId?: string | null;
  },
): Promise<void> {
  if (actor.user.type !== "ADMIN") return;
  const result = await auditService.record({
    ...input,
    actor: {
      userId: actor.user.id,
      name: actor.user.name ?? null,
      email: actor.user.email,
    },
  });
  if (!result.success) {
    logger.error("Admin audit write failed", { error: result.error, action: input.action, entityType: input.entityType });
  }
}
