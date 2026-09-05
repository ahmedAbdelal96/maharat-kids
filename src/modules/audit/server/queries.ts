import "server-only";

import { failure } from "@/core/result";
import { requirePermissionForUser } from "@/modules/auth/server/queries";
import { getAdminContext } from "@/modules/admin/server/guards";
import { AUDIT_PERMISSION } from "../constants";
import { AuditLogService } from "../domain/service";
import { PrismaAuditLogRepository } from "../infrastructure/repository";
import type { AuditLogFilters } from "../types";

function service() { return new AuditLogService(new PrismaAuditLogRepository()); }

export async function getAdminAuditLog(filters: AuditLogFilters = {}) {
  const context = await getAdminContext();
  const allowed = await requirePermissionForUser(context.user.id, AUDIT_PERMISSION);
  if (!allowed.success) return failure(allowed.error);
  return service().list(filters);
}
