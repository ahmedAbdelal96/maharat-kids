"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Search, SlidersHorizontal, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/formatters";

import { updateCustomerStatus } from "../server/actions";
import type { AdminCustomer } from "../types";
import type { AdminCustomerListPage, CustomerListQuery } from "../intelligence/types";

function statusVariant(status: string): "success" | "warning" | "destructive" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "destructive";
  return "warning";
}

function pageHref(page: number, query: CustomerListQuery) {
  const params = new URLSearchParams({ page: String(page) });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.purchase) params.set("purchase", query.purchase);
  if (query.value) params.set("value", query.value);
  if (query.marketing) params.set("marketing", query.marketing);
  return `/admin/customers?${params.toString()}`;
}

export function AdminCustomersClient({ initialCustomers, canUpdate, currency, query }: { initialCustomers: AdminCustomerListPage; canUpdate: boolean; currency: string; query: CustomerListQuery }) {
  const t = useTranslations("admin");
  const productLabels = useTranslations("products");
  const router = useRouter();
  const customers = initialCustomers.items;
  const [search, setSearch] = useState(query.search ?? "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminCustomer | null>(null);

  async function setStatus(customer: AdminCustomer, status: "ACTIVE" | "SUSPENDED") {
    setIsSaving(true); setErrorMessage("");
    const result = await updateCustomerStatus({ customerId: customer.id, status });
    if (result.success) {
      setSuspendTarget(null);
      router.refresh();
    } else setErrorMessage(result.error.message);
    setIsSaving(false);
  }

  function requestStatusChange(customer: AdminCustomer, status: "ACTIVE" | "SUSPENDED") {
    setErrorMessage("");
    if (status === "SUSPENDED") {
      setSuspendTarget(customer);
      return;
    }
    void setStatus(customer, status);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-[var(--primary)]">{t("customerOperations")}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{t("customers")} <span className="text-base font-medium text-[var(--text-muted)]">{formatNumber(initialCustomers.total)}</span></h1><p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">{t("manageCustomerData")}</p></div><Link href="/admin/customers/segments"><Button variant="outline" size="sm">{t("segments")}</Button></Link></div>
      <form className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="relative block lg:col-span-2"><span className="sr-only">{t("searchCustomers")}</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" /><Input name="search" placeholder={t("nameEmailPhone")} value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 text-xs" /></label>
        <select name="status" defaultValue={query.status ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">{t("allStatuses")}</option><option value="ACTIVE">{t("active")}</option><option value="INACTIVE">{t("inactive")}</option><option value="SUSPENDED">{t("suspended")}</option><option value="PENDING">{t("pending")}</option></select>
        <select name="purchase" defaultValue={query.purchase ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">{t("allOrders")}</option><option value="HAS_ORDERS">{t("hasOrders")}</option><option value="NO_ORDERS">{t("noOrders")}</option></select>
        <select name="marketing" defaultValue={query.marketing ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">{t("marketingConsent")}</option><option value="OPTED_IN">{t("optedIn")}</option><option value="NOT_OPTED_IN">{t("notOptedIn")}</option></select>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5"><SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" /><select name="value" defaultValue={query.value ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">{t("allValue")}</option><option value="HAS_SPENT">{t("hasSpent")}</option><option value="NEVER_PURCHASED">{t("neverPurchased")}</option></select><Button type="submit" size="sm">{t("applyFilters")}</Button><Link href="/admin/customers" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)]">{t("clear")}</Link></div>
      </form>
      {errorMessage && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{errorMessage}</p>}
      {customers.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]"><UserRound className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />{t("noCustomers")}</CardContent></Card> : <Table><TableHeader><TableRow><TableHead>{t("customer")}</TableHead><TableHead>{t("registered")}</TableHead><TableHead>{t("lastLogin")}</TableHead><TableHead>{t("orderCount")}</TableHead><TableHead>{t("totalSpent")}</TableHead><TableHead>{t("consent")}</TableHead><TableHead>{t("status")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader><TableBody>{customers.map((customer) => <TableRow key={customer.id}><TableCell><Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 group"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]">{(customer.name || customer.email).charAt(0).toUpperCase()}</div><div><span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{customer.name || t("unnamedCustomer")}</span><p className="text-[11px] text-[var(--text-muted)]">{customer.email}</p><p className="text-[11px] text-[var(--text-muted)]">{customer.phone || t("noPhone")}</p></div></Link></TableCell><TableCell className="text-xs text-[var(--text-secondary)]">{formatDate(customer.createdAt)}</TableCell><TableCell className="text-xs text-[var(--text-secondary)]">{customer.lastLoginAt ? formatDate(customer.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) : t("never")}<p className="text-[10px] text-[var(--text-muted)]">{formatNumber(customer.loginCount)} {t("successful")}</p></TableCell><TableCell className="text-xs font-semibold">{formatNumber(customer.orderCount)}</TableCell><TableCell className="text-xs font-semibold">{formatMoney(customer.totalSpent, currency)}</TableCell><TableCell><Badge variant={customer.marketingConsent ? "success" : "outline"} size="sm">{customer.marketingConsent ? t("optedIn") : t("noResults")}</Badge></TableCell><TableCell><Badge variant={statusVariant(customer.status)} size="sm">{customer.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Link href={`/admin/customers/${customer.id}`}><Button variant="ghost" size="sm">{t("view")}</Button></Link>{canUpdate && (customer.status === "SUSPENDED" ? <Button variant="outline" size="sm" disabled={isSaving} onClick={() => void requestStatusChange(customer, "ACTIVE")}>{t("activate")}</Button> : <Button variant="outline" size="sm" disabled={isSaving} onClick={() => requestStatusChange(customer, "SUSPENDED")}>{t("suspend")}</Button>)}</div></TableCell></TableRow>)}</TableBody></Table>}
      {initialCustomers.totalPages > 1 && <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-xs"><span className="text-[var(--text-secondary)]">{t("page", { current: initialCustomers.page, total: initialCustomers.totalPages })}</span><div className="flex gap-2">{initialCustomers.page > 1 && <Link href={pageHref(initialCustomers.page - 1, query)}><Button variant="outline" size="sm">{productLabels("previous")}</Button></Link>}{initialCustomers.page < initialCustomers.totalPages && <Link href={pageHref(initialCustomers.page + 1, query)}><Button variant="outline" size="sm">{productLabels("next")}</Button></Link>}</div></div>}
      <Modal isOpen={suspendTarget !== null} onClose={() => { if (!isSaving) setSuspendTarget(null); }} title={t("suspendCustomer")} description={suspendTarget ? t("suspendDescription", { name: suspendTarget.name || suspendTarget.email }) : undefined} maxWidth="sm"><div className="space-y-5"><p className="text-sm leading-6 text-[var(--text-secondary)]">{t("suspendWarning")}</p>{errorMessage && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{errorMessage}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isSaving} onClick={() => setSuspendTarget(null)}>{t("cancel")}</Button><Button type="button" variant="destructive" isLoading={isSaving} onClick={() => { if (suspendTarget) void setStatus(suspendTarget, "SUSPENDED"); }}>{t("suspendConfirm")}</Button></div></div></Modal>
    </div>
  );
}
