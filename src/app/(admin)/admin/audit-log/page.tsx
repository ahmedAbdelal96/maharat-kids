import { redirect } from "next/navigation";
import { AdminAuditLogClient } from "@/modules/audit/components/admin-audit-log-client";
import { getAdminAuditLog } from "@/modules/audit/server/queries";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type AuditAction, type AuditEntityType } from "@/modules/audit/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity Log | Admin", description: "Review successful administrative activity." };

type SearchParams = Promise<{ search?: string; entity?: string; action?: string; actor?: string; dateRange?: string; from?: string; to?: string; page?: string }>;

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateRangeFilters(range: string, fromValue?: string, toValue?: string): { from?: Date; to?: Date } {
  if (range === "custom") return { from: parseDate(fromValue), to: parseDate(toValue, true) };
  if (!["today", "last7", "last30"].includes(range)) return {};
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === "last7") from.setUTCDate(from.getUTCDate() - 6);
  if (range === "last30") from.setUTCDate(from.getUTCDate() - 29);
  return { from, to: range === "today" ? new Date(from.getTime() + 86400000 - 1) : now };
}

export default async function AdminAuditLogPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const entity = Object.values(AUDIT_ENTITY_TYPES).includes(params.entity as AuditEntityType) ? params.entity as AuditEntityType : undefined;
  const action = Object.values(AUDIT_ACTIONS).includes(params.action as AuditAction) ? params.action as AuditAction : undefined;
  const actor = params.actor?.trim().slice(0, 100) || undefined;
  const dateRange = ["today", "last7", "last30", "custom"].includes(params.dateRange ?? "") ? params.dateRange ?? "" : "";
  const dates = dateRangeFilters(dateRange, params.from, params.to);
  const search = params.search?.trim().slice(0, 100) ?? "";
  const page = Number.parseInt(params.page ?? "1", 10);
  const result = await getAdminAuditLog({ search, entityType: entity, action, actorUserId: actor, ...dates, page: Number.isFinite(page) && page > 0 ? page : 1, pageSize: 30 });
  if (!result.success) { if (result.error.code === "UNAUTHENTICATED" || result.error.code === "UNAUTHORIZED") redirect("/login?callbackUrl=/admin/audit-log"); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); throw result.error; }
  return <AdminAuditLogClient data={result.data} initialSearch={search} initialEntity={entity ?? ""} initialAction={action ?? ""} initialActor={actor ?? ""} initialDateRange={dateRange} initialFrom={params.from ?? ""} initialTo={params.to ?? ""} />;
}
