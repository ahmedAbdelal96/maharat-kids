"use client";

import Link from "next/link";
import { Download, Filter, Search, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/formatters";

import { customerSegmentQueryString } from "../segments/query";
import { defaultHighValueThreshold } from "../segments/constants";
import type { CustomerSegmentPage, CustomerSegmentQuery } from "../segments/types";

function href(query: CustomerSegmentQuery, overrides: Record<string, string | undefined> = {}) {
  const queryString = customerSegmentQueryString(query, overrides);
  return `/admin/customers/segments${queryString ? `?${queryString}` : ""}`;
}

function exportHref(query: CustomerSegmentQuery, mode: "marketing" | "operational") {
  const queryString = customerSegmentQueryString(query, { mode, page: undefined });
  return `/api/admin/customers/segments/export?${queryString}`;
}

export function AdminCustomerSegmentsClient({ data, query, currency }: { data: CustomerSegmentPage; query: CustomerSegmentQuery; currency: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--primary)]">Customer operations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Segments &amp; audiences</h1>
          <p className="mt-1 max-w-2xl text-xs text-[var(--text-secondary)] sm:text-sm">Use live customer data to understand audiences and export only the data your operation is allowed to use.</p>
        </div>
        <Link href="/admin/customers"><Button variant="outline" size="sm">Back to customers</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.definitions.map((definition) => (
          <Link key={definition.key} href={href(query, { segment: definition.key, page: undefined })}>
            <Card className={`h-full transition-colors hover:border-[var(--primary)] ${definition.key === query.segment ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/20" : ""}`}>
              <CardHeader className="p-4 pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-sm">{definition.name}</CardTitle><Badge variant={definition.key === query.segment ? "default" : "outline"} size="sm">{formatNumber(definition.count)}</Badge></div></CardHeader>
              <CardContent className="p-4 pt-0"><CardDescription className="text-xs leading-5">{definition.description}</CardDescription></CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-[var(--primary)]" /><div><CardTitle className="text-base">Filter {data.definition.name}</CardTitle><CardDescription>All filters are applied on the server against PostgreSQL.</CardDescription></div></div></CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="segment" value={query.segment} />
            <label className="relative block lg:col-span-2"><span className="sr-only">Search customers</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" /><Input name="search" defaultValue={query.search ?? ""} placeholder="Name, email, or phone" className="pl-9" /></label>
            <select name="consent" defaultValue={query.consent ?? ""} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm"><option value="">Any consent</option><option value="OPTED_IN">Opted in</option><option value="NOT_OPTED_IN">Not opted in</option></select>
            <select name="sort" defaultValue={query.sort ?? "newest"} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest_spent">Highest spend</option><option value="lowest_spent">Lowest spend</option><option value="most_orders">Most orders</option><option value="recent_login">Recent login</option></select>
            <Input name="minSpend" type="number" min="0" step="0.01" defaultValue={query.minSpend ?? ""} placeholder="Minimum spend" />
            <Input name="maxSpend" type="number" min="0" step="0.01" defaultValue={query.maxSpend ?? ""} placeholder="Maximum spend" />
            <Input name="minOrders" type="number" min="1" step="1" defaultValue={query.minOrders ?? ""} placeholder="Minimum orders" />
            <Input name="maxOrders" type="number" min="1" step="1" defaultValue={query.maxOrders ?? ""} placeholder="Maximum orders" />
            {query.segment === "high_value" && <Input name="threshold" type="number" min="0" step="0.01" defaultValue={query.highValueThreshold ?? defaultHighValueThreshold} placeholder="High-value threshold" />}
            {query.segment === "inactive" && <select name="days" defaultValue={String(query.inactiveDays ?? 30)} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm"><option value="30">Inactive for 30+ days</option><option value="60">Inactive for 60+ days</option><option value="90">Inactive for 90+ days</option></select>}
            {query.segment === "recently_registered" && <select name="registeredDays" defaultValue={String(query.registeredDays ?? 7)} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm"><option value="7">Registered in 7 days</option><option value="30">Registered in 30 days</option></select>}
            <div className="flex items-center gap-2 lg:col-span-4"><Button type="submit" size="sm">Apply filters</Button><Link href={href(query, { page: undefined, search: undefined, consent: undefined, minSpend: undefined, maxSpend: undefined, minOrders: undefined, maxOrders: undefined, threshold: undefined, days: undefined, registeredDays: undefined, lastLoginDays: undefined, sort: undefined })}><Button type="button" variant="outline" size="sm">Clear</Button></Link></div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Audience</p><p className="mt-1 text-xl font-bold">{formatNumber(data.summary.totalCustomers)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Qualifying spend</p><p className="mt-1 text-xl font-bold">{formatMoney(data.summary.totalSpend, currency)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Opted in</p><p className="mt-1 text-xl font-bold">{formatNumber(data.summary.optedIn)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Average spend</p><p className="mt-1 text-xl font-bold">{formatMoney(data.summary.averageCustomerSpend, currency)}</p></CardContent></Card></div>

      {data.canExport ? <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Export this audience</p><p className="text-xs text-[var(--text-secondary)]">Marketing CSV is restricted to opted-in customers. Operational CSV keeps the selected filters.</p></div><div className="flex flex-wrap gap-2"><a href={exportHref(query, "marketing")}><Button variant="outline" size="sm"><Download className="h-4 w-4" />Marketing CSV</Button></a><a href={exportHref(query, "operational")}><Button size="sm"><Download className="h-4 w-4" />Operational CSV</Button></a></div></div> : <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-secondary)]">CSV export requires the customers.export permission.</p>}

      {data.items.length === 0 ? <Card><CardContent className="py-12 text-center"><UsersRound className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" /><p className="text-sm font-semibold">No customers in this audience</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Try another segment or adjust the filters.</p></CardContent></Card> : <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Registered</TableHead><TableHead>Last login</TableHead><TableHead>Orders</TableHead><TableHead>Qualifying spend</TableHead><TableHead>Cart</TableHead><TableHead>Consent</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{data.items.map((customer) => <TableRow key={customer.id}><TableCell><Link href={`/admin/customers/${customer.id}`} className="group"><span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{customer.name || "Unnamed customer"}</span><p className="text-xs text-[var(--text-muted)]">{customer.email}</p><p className="text-xs text-[var(--text-muted)]">{customer.phone || "No phone"}</p></Link></TableCell><TableCell className="whitespace-nowrap text-xs">{formatDate(customer.createdAt)}</TableCell><TableCell className="whitespace-nowrap text-xs">{customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Never"}</TableCell><TableCell className="text-xs font-semibold">{formatNumber(customer.orderCount)} <span className="font-normal text-[var(--text-muted)]">({formatNumber(customer.paidOrderCount)} paid)</span></TableCell><TableCell className="whitespace-nowrap text-xs font-semibold">{formatMoney(customer.totalSpent, currency)}</TableCell><TableCell className="whitespace-nowrap text-xs">{customer.cartItemCount ? `${formatNumber(customer.cartItemCount)} · ${formatMoney(customer.cartValue, currency)}` : "Empty"}</TableCell><TableCell><Badge variant={customer.marketingConsent ? "success" : "outline"} size="sm">{customer.marketingConsent ? "Opted in" : "No"}</Badge></TableCell><TableCell className="text-right"><Link href={`/admin/customers/${customer.id}`}><Button variant="ghost" size="sm">View</Button></Link></TableCell></TableRow>)}</TableBody></Table>}

      {data.totalPages > 1 && <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-xs"><span className="text-[var(--text-secondary)]">Page {data.page} of {data.totalPages}</span><div className="flex gap-2">{data.page > 1 && <Link href={href(query, { page: String(data.page - 1) })}><Button variant="outline" size="sm">Previous</Button></Link>}{data.page < data.totalPages && <Link href={href(query, { page: String(data.page + 1) })}><Button variant="outline" size="sm">Next</Button></Link>}</div></div>}
    </div>
  );
}
