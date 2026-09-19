"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown, ChevronRight, ClipboardList, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auditActionLabels, auditEntityLabels, type AuditAction, type AuditEntityType } from "../constants";
import type { AuditChangeField, AuditLogItem, AuditLogPage } from "../types";

function valueLabel(value: AuditChangeField["before"]): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null) return "None";
  if (typeof value === "object") return "Details";
  return String(value);
}

function entityHref(item: AuditLogItem): string | null {
  if (!item.entityId) return null;
  const routes: Partial<Record<AuditEntityType, string>> = {
    PRODUCT: `/admin/products?product=${encodeURIComponent(item.entityId)}`,
    ORDER: `/admin/orders?order=${encodeURIComponent(item.entityId)}`,
    COUPON: `/admin/coupons/${item.entityId}`,
    PROMOTION: `/admin/promotions/${item.entityId}`,
    RETURN: `/admin/returns/${item.entityId}`,
    CUSTOMER: `/admin/customers/${item.entityId}`,
  };
  return routes[item.entityType] ?? null;
}

export function AdminAuditLogClient({ data, initialSearch, initialEntity, initialAction, initialActor, initialDateRange, initialFrom, initialTo }: { data: AuditLogPage; initialSearch: string; initialEntity: string; initialAction: string; initialActor: string; initialDateRange: string; initialFrom: string; initialTo: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Operations</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Activity Log</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">A trustworthy record of successful administrative changes across the store.</p>
      </header>

      <Card>
        <CardContent className="p-4">
          <form action="/admin/audit-log" method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_210px_220px_150px_150px_auto] xl:items-end">
            <label className="block text-xs font-semibold">Search<Input name="search" defaultValue={initialSearch} placeholder="Order, product, coupon, admin..." className="mt-1" /></label>
            <label className="block text-xs font-semibold">Entity<select name="entity" defaultValue={initialEntity} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="">All entities</option>{Object.entries(auditEntityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-xs font-semibold">Action<select name="action" defaultValue={initialAction} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="">All actions</option>{Object.entries(auditActionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-xs font-semibold">Actor<select name="actor" defaultValue={initialActor} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="">All admins</option>{data.actors.map((actor) => <option key={actor.userId} value={actor.userId}>{actor.name || actor.email}</option>)}</select></label>
            <label className="block text-xs font-semibold">Date range<select name="dateRange" defaultValue={initialDateRange} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="">All time</option><option value="today">Today</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="custom">Custom</option></select></label>
            <label className="block text-xs font-semibold">From<Input type="date" name="from" defaultValue={initialFrom} className="mt-1" /></label>
            <label className="block text-xs font-semibold">To<Input type="date" name="to" defaultValue={initialTo} className="mt-1" /></label>
            <Button type="submit" variant="outline" className="gap-2"><Search className="h-4 w-4" />Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/60 text-[var(--text-muted)]"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Admin</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Changes</th><th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.items.length === 0 ? <tr><td colSpan={6} className="px-5 py-16 text-center"><ClipboardList className="mx-auto h-7 w-7 text-[var(--text-muted)]" /><p className="mt-3 font-semibold text-[var(--text-primary)]">No activity found</p><p className="mt-1 text-[var(--text-secondary)]">Try a different search or filter.</p></td></tr> : data.items.map((item) => {
                const fields = item.changes?.fields ?? [];
                const href = entityHref(item);
                const isExpanded = expanded === item.id;
                return <tr key={item.id} className="align-top hover:bg-[var(--surface-muted)]/30"><td className="whitespace-nowrap px-5 py-4 text-[var(--text-secondary)]">{new Date(item.createdAt).toLocaleString()}</td><td className="px-5 py-4"><p className="font-semibold text-[var(--text-primary)]">{item.actor.name || "Unnamed admin"}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.actor.email}</p></td><td className="px-5 py-4"><Badge variant="secondary" size="sm">{auditActionLabels[item.action as AuditAction] ?? item.action.replaceAll("_", " ")}</Badge></td><td className="px-5 py-4">{href ? <Link href={href} className="font-semibold text-[var(--primary)] hover:underline">{item.entityLabel}</Link> : <span className="font-semibold text-[var(--text-primary)]">{item.entityLabel}</span>}<p className="mt-1 text-[11px] text-[var(--text-muted)]">{auditEntityLabels[item.entityType as AuditEntityType] ?? item.entityType}</p></td><td className="px-5 py-4">{fields.length > 0 ? <div className="space-y-1">{fields.slice(0, 2).map((field) => <p key={field.field}><span className="text-[var(--text-muted)]">{field.field}:</span> <span className="text-[var(--text-secondary)]">{valueLabel(field.before)}</span> <span className="px-1 text-[var(--text-muted)]">→</span> <span className="font-semibold text-[var(--text-primary)]">{valueLabel(field.after)}</span></p>)}{fields.length > 2 && <p className="text-[11px] text-[var(--text-muted)]">+{fields.length - 2} more changes</p>}</div> : <span className="text-[var(--text-muted)]">Action completed</span>}</td><td className="px-5 py-4 text-right">{fields.length > 2 || item.metadata ? <Button type="button" variant="ghost" size="icon" aria-label={`${isExpanded ? "Hide" : "Show"} details for ${item.entityLabel}`} onClick={() => setExpanded(isExpanded ? null : item.id)}>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button> : null}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        {expanded && data.items.find((item) => item.id === expanded) && <AuditDetails item={data.items.find((item) => item.id === expanded)!} />}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--text-secondary)]"><span>Page {data.page} of {data.totalPages} · {data.total} records</span><div className="flex gap-2"><PaginationLink data={data} href={pageHref(data.page - 1, initialSearch, initialEntity, initialAction, initialActor, initialDateRange, initialFrom, initialTo)} disabled={data.page <= 1}>Previous</PaginationLink><PaginationLink data={data} href={pageHref(data.page + 1, initialSearch, initialEntity, initialAction, initialActor, initialDateRange, initialFrom, initialTo)} disabled={data.page >= data.totalPages}>Next</PaginationLink></div></div>
      </Card>
    </div>
  );
}

function pageHref(page: number, search: string, entity: string, action: string, actor: string, dateRange: string, from: string, to: string): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (entity) params.set("entity", entity);
  if (action) params.set("action", action);
  if (actor) params.set("actor", actor);
  if (dateRange) params.set("dateRange", dateRange);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", String(Math.max(1, page)));
  return `/admin/audit-log?${params.toString()}`;
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: string; data: AuditLogPage }) {
  return disabled ? <span className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 opacity-40">{children}</span> : <Link href={href} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-muted)]">{children}</Link>;
}

function AuditDetails({ item }: { item: AuditLogItem }) {
  return <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/30 px-5 py-4"><p className="text-xs font-bold text-[var(--text-primary)]">Activity details</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{item.changes?.fields.map((field) => <div key={field.field} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] p-3 text-xs"><p className="font-semibold">{field.field}</p><p className="mt-1 text-[var(--text-muted)]">Before: <span className="text-[var(--text-secondary)]">{valueLabel(field.before)}</span></p><p className="mt-1 text-[var(--text-muted)]">After: <span className="font-semibold text-[var(--text-primary)]">{valueLabel(field.after)}</span></p></div>)}</div>{item.requestId && <p className="mt-3 text-[11px] text-[var(--text-muted)]">Request ID: {item.requestId}</p>}</div>;
}
