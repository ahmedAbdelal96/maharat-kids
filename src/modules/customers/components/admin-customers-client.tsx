"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-[var(--primary)]">Customer operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Customers <span className="text-base font-medium text-[var(--text-muted)]">{formatNumber(initialCustomers.total)}</span></h1><p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">Search customer value, account status, and recent activity.</p></div><Link href="/admin/customers/segments"><Button variant="outline" size="sm">Segments / Audiences</Button></Link></div>
      <form className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="relative block lg:col-span-2"><span className="sr-only">Search customers</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" /><Input name="search" placeholder="Name, email, or phone" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 text-xs" /></label>
        <select name="status" defaultValue={query.status ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option><option value="PENDING">Pending</option></select>
        <select name="purchase" defaultValue={query.purchase ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">All orders</option><option value="HAS_ORDERS">Has orders</option><option value="NO_ORDERS">No orders</option></select>
        <select name="marketing" defaultValue={query.marketing ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">Marketing consent</option><option value="OPTED_IN">Opted in</option><option value="NOT_OPTED_IN">Not opted in</option></select>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5"><SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" /><select name="value" defaultValue={query.value ?? ""} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--foreground)]"><option value="">All customer value</option><option value="HAS_SPENT">Has spent</option><option value="NEVER_PURCHASED">Never purchased</option></select><Button type="submit" size="sm">Apply filters</Button><Link href="/admin/customers" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)]">Clear</Link></div>
      </form>
      {errorMessage && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{errorMessage}</p>}
      {customers.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]"><UserRound className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />No customers found for these filters.</CardContent></Card> : <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Registered</TableHead><TableHead>Last login</TableHead><TableHead>Orders</TableHead><TableHead>Total spent</TableHead><TableHead>Consent</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{customers.map((customer) => <TableRow key={customer.id}><TableCell><Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 group"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]">{(customer.name || customer.email).charAt(0).toUpperCase()}</div><div><span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{customer.name || "Unnamed customer"}</span><p className="text-[11px] text-[var(--text-muted)]">{customer.email}</p><p className="text-[11px] text-[var(--text-muted)]">{customer.phone || "No phone"}</p></div></Link></TableCell><TableCell className="text-xs text-[var(--text-secondary)]">{formatDate(customer.createdAt)}</TableCell><TableCell className="text-xs text-[var(--text-secondary)]">{customer.lastLoginAt ? formatDate(customer.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) : "Never"}<p className="text-[10px] text-[var(--text-muted)]">{formatNumber(customer.loginCount)} successful</p></TableCell><TableCell className="text-xs font-semibold">{formatNumber(customer.orderCount)}</TableCell><TableCell className="text-xs font-semibold">{formatMoney(customer.totalSpent, currency)}</TableCell><TableCell><Badge variant={customer.marketingConsent ? "success" : "outline"} size="sm">{customer.marketingConsent ? "Opted in" : "No"}</Badge></TableCell><TableCell><Badge variant={statusVariant(customer.status)} size="sm">{customer.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Link href={`/admin/customers/${customer.id}`}><Button variant="ghost" size="sm">View</Button></Link>{canUpdate && (customer.status === "SUSPENDED" ? <Button variant="outline" size="sm" disabled={isSaving} onClick={() => void requestStatusChange(customer, "ACTIVE")}>Activate</Button> : <Button variant="outline" size="sm" disabled={isSaving} onClick={() => requestStatusChange(customer, "SUSPENDED")}>Suspend</Button>)}</div></TableCell></TableRow>)}</TableBody></Table>}
      {initialCustomers.totalPages > 1 && <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-xs"><span className="text-[var(--text-secondary)]">Page {initialCustomers.page} of {initialCustomers.totalPages}</span><div className="flex gap-2">{initialCustomers.page > 1 && <Link href={pageHref(initialCustomers.page - 1, query)}><Button variant="outline" size="sm">Previous</Button></Link>}{initialCustomers.page < initialCustomers.totalPages && <Link href={pageHref(initialCustomers.page + 1, query)}><Button variant="outline" size="sm">Next</Button></Link>}</div></div>}
      <Modal isOpen={suspendTarget !== null} onClose={() => { if (!isSaving) setSuspendTarget(null); }} title="Suspend customer?" description={suspendTarget ? `${suspendTarget.name || suspendTarget.email} will no longer be able to sign in.` : undefined} maxWidth="sm"><div className="space-y-5"><p className="text-sm leading-6 text-[var(--text-secondary)]">This is a high-impact action. The customer will lose access to their account until an administrator activates them again.</p>{errorMessage && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{errorMessage}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isSaving} onClick={() => setSuspendTarget(null)}>Cancel</Button><Button type="button" variant="destructive" isLoading={isSaving} onClick={() => { if (suspendTarget) void setStatus(suspendTarget, "SUSPENDED"); }}>Suspend Customer</Button></div></div></Modal>
    </div>
  );
}
