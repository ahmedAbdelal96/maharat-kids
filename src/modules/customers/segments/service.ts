import "server-only";

import { AppError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { PermissionKey } from "@/modules/identity/types";

import { defaultHighValueThreshold } from "./constants";
import type { CustomerSegmentsRepository } from "./repository";
import type { CustomerSegmentPage, CustomerSegmentQuery, CustomerSegmentRow } from "./types";

export type CustomerExportMode = "marketing" | "operational";

function csvCell(value: string | number | boolean | Date | null | undefined) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function customerRowsToCsv(rows: CustomerSegmentRow[]) {
  const headers = [
    "customer_id", "name", "email", "phone", "registered_at", "first_login_at", "last_login_at",
    "login_count", "orders", "paid_orders", "total_spent", "average_order_value", "active_cart_items",
    "active_cart_value", "favorites", "marketing_consent", "marketing_consent_at",
  ];
  const lines = rows.map((row) => [
    row.id, row.name, row.email, row.phone, row.createdAt, row.firstLoginAt, row.lastLoginAt,
    row.loginCount, row.orderCount, row.paidOrderCount, row.totalSpent,
    row.paidOrderCount > 0 ? (Number(row.totalSpent) / row.paidOrderCount).toFixed(2) : "0.00",
    row.cartItemCount, row.cartValue, row.favoritesCount, row.marketingConsent, row.marketingConsentAt,
  ].map(csvCell).join(","));
  return [headers.map(csvCell).join(","), ...lines].join("\n");
}

export class CustomerSegmentsService {
  constructor(private readonly repository: CustomerSegmentsRepository, private readonly authorization: AuthorizationService) {}

  private async authorize(actor: AuthenticatedUser, permission: PermissionKey) {
    return this.authorization.requirePermission(actor.user.id, permission);
  }

  async getPage(actor: AuthenticatedUser, query: CustomerSegmentQuery): Promise<Result<CustomerSegmentPage, AppError>> {
    const allowed = await this.authorize(actor, "customers.view" as PermissionKey);
    if (!allowed.success) return failure(allowed.error);
    try {
      const [definitions, audience] = await Promise.all([
        this.repository.getCounts(query),
        this.repository.findAudience(query),
      ]);
      return success({ ...audience, definitions, canExport: actor.permissions.includes("customers.export" as PermissionKey) });
    } catch {
      return failure(new AppError("CUSTOMER_SEGMENTS_FAILED", "Customer segments could not be loaded."));
    }
  }

  async exportCsv(actor: AuthenticatedUser, query: CustomerSegmentQuery, mode: CustomerExportMode): Promise<Result<string, AppError>> {
    const permission = mode === "marketing" ? "customers.export" : "customers.export";
    const allowed = await this.authorize(actor, permission as PermissionKey);
    if (!allowed.success) return failure(allowed.error);
    try {
      const exportQuery = mode === "marketing"
        ? { ...query, consent: "OPTED_IN" as const }
        : query;
      return success(customerRowsToCsv(await this.repository.buildExportRows({
        ...exportQuery,
        highValueThreshold: exportQuery.highValueThreshold ?? defaultHighValueThreshold,
      })));
    } catch {
      return failure(new AppError("CUSTOMER_EXPORT_FAILED", "Customer audience could not be exported."));
    }
  }
}

