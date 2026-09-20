"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Activity, CheckCircle2, Heart, MapPin, Package, ShieldCheck, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductImage } from "@/components/ecommerce/product-image";
import { formatCustomerAddress } from "../address";
import { formatDate, formatMoney, formatNumber } from "@/lib/formatters";
import { updateCustomerStatus } from "../server/actions";
import type { AdminCustomer360, CustomerActivityEvent } from "../intelligence/types";

type TabId = "overview" | "orders" | "profile" | "addresses" | "cart" | "activity";

function statusVariant(status: string): "success" | "warning" | "destructive" {
  if (["ACTIVE", "PAID", "DELIVERED", "COMPLETED"].includes(status)) return "success";
  if (["SUSPENDED", "CANCELLED", "FAILED"].includes(status)) return "destructive";
  return "warning";
}

function activityIcon(type: CustomerActivityEvent["type"]) {
  if (type === "ORDER") return Package;
  if (type === "FAVORITE") return Heart;
  if (type === "LOGIN") return ShieldCheck;
  if (type === "STATUS" || type === "PAYMENT") return CheckCircle2;
  return Activity;
}

export function AdminCustomer360Client({ initialData, currency }: { initialData: AdminCustomer360; currency: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const { profile, metrics } = initialData;

  async function changeStatus(status: "ACTIVE" | "SUSPENDED") {
    setIsSaving(true); setMessage(""); setError("");
    const result = await updateCustomerStatus({ customerId: profile.id, status });
    if (result.success) {
      setConfirmSuspend(false);
      setMessage(`Customer ${status === "ACTIVE" ? "activated" : "suspended"}. Refresh the page to see the latest status.`);
    }
    else setError(result.error.message);
    setIsSaving(false);
  }

  function requestStatusChange(status: "ACTIVE" | "SUSPENDED") {
    if (status === "SUSPENDED") {
      setError("");
      setConfirmSuspend(true);
      return;
    }
    void changeStatus(status);
  }

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders", count: profile.orderCount },
    { id: "profile", label: "Profile" },
    { id: "addresses", label: "Addresses", count: initialData.addresses.length },
    { id: "cart", label: "Cart & Favorites", count: initialData.favorites.length },
    { id: "activity", label: "Activity", count: initialData.activity.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-lg font-black text-[var(--primary)]">{(profile.name || profile.email || profile.phone || "C").charAt(0).toUpperCase()}</div>
          <div className="min-w-0"><p className="text-xs font-semibold text-[var(--primary)]">Customer 360</p><h1 className="truncate text-2xl font-black text-[var(--text-primary)]">{profile.name || "Unnamed customer"}</h1><p className="truncate text-sm text-[var(--text-secondary)]">{profile.email}{profile.phone ? ` · ${profile.phone}` : ""}</p></div>
        </div>
        {initialData.canUpdate && <div className="flex gap-2">{profile.status === "SUSPENDED" ? <Button variant="outline" size="sm" disabled={isSaving} onClick={() => requestStatusChange("ACTIVE")}>Activate</Button> : <Button variant="outline" size="sm" disabled={isSaving} onClick={() => requestStatusChange("SUSPENDED")}>Suspend</Button>}</div>}
      </div>
      {(message || error) && <p role="alert" className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium ${error ? "border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] text-[var(--destructive)]" : "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]"}`}>{error || message}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Status</p><Badge className="mt-2" size="sm" variant={statusVariant(profile.status)}>{profile.status}</Badge></Card><Card className="p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Registered</p><p className="mt-2 text-sm font-bold">{formatDate(profile.createdAt)}</p></Card><Card className="p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Last successful login</p><p className="mt-2 text-sm font-bold">{profile.lastLoginAt ? formatDate(profile.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) : "Never"}</p><p className="text-[11px] text-[var(--text-muted)]">{formatNumber(profile.loginCount)} total</p></Card><Card className="p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Marketing consent</p><p className="mt-2 text-sm font-bold">{profile.marketingConsent ? "Opted in" : "Not opted in"}</p>{profile.marketingConsentAt && <p className="text-[11px] text-[var(--text-muted)]">Since {formatDate(profile.marketingConsentAt)}</p>}</Card></div>
      <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-1" role="tablist">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.id ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>{tab.label}{typeof tab.count === "number" && <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">{tab.count}</span>}</button>)}</div>
      {activeTab === "overview" && <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]"><Card><CardHeader><CardTitle className="text-base">Customer value</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-[11px] text-[var(--text-muted)]">Total spent</p><p className="mt-1 text-lg font-black">{formatMoney(metrics.totalSpent, currency)}</p></div><div><p className="text-[11px] text-[var(--text-muted)]">Paid orders</p><p className="mt-1 text-lg font-black">{formatNumber(metrics.paidOrders)}</p></div><div><p className="text-[11px] text-[var(--text-muted)]">Average order</p><p className="mt-1 text-lg font-black">{formatMoney(metrics.averageOrderValue, currency)}</p></div><div><p className="text-[11px] text-[var(--text-muted)]">Cancelled</p><p className="mt-1 text-lg font-black">{formatNumber(metrics.cancelledOrders)}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader><CardContent className="space-y-3">{initialData.activity.slice(0, 5).map((event) => { const Icon = activityIcon(event.type); return <div key={event.id} className="flex gap-2 text-xs"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div><p className="font-semibold">{event.title}</p><p className="text-[var(--text-muted)]">{formatDate(event.createdAt)} · {event.description}</p></div></div>; })}</CardContent></Card></div>}
      {activeTab === "orders" && <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Orders</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Order history and payment status.</p></div><span className="text-xs text-[var(--text-muted)]">{formatNumber(profile.orderCount)} total</span></div></CardHeader><CardContent className="p-0">{initialData.orders.length === 0 ? <p className="px-6 pb-6 text-sm text-[var(--text-secondary)]">No orders yet.</p> : <Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Date</TableHead><TableHead>Payment</TableHead><TableHead>Fulfillment</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{initialData.orders.map((order) => <TableRow key={order.id}><TableCell><Link href={`/admin/orders?order=${order.id}`} className="font-mono text-xs font-bold text-[var(--primary)] hover:underline">{order.orderNumber}</Link></TableCell><TableCell className="text-xs text-[var(--text-secondary)]">{formatDate(order.createdAt)}</TableCell><TableCell><Badge size="sm" variant={statusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge></TableCell><TableCell><Badge size="sm" variant={statusVariant(order.status)}>{order.status}</Badge></TableCell><TableCell className="text-right text-sm font-bold">{formatMoney(order.total, order.currency)}</TableCell></TableRow>)}</TableBody></Table>}{initialData.ordersTotalPages > 1 && <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 text-xs"><span className="text-[var(--text-secondary)]">Page {initialData.ordersPage} of {initialData.ordersTotalPages}</span><span className="flex gap-3">{initialData.ordersPage > 1 && <Link href={`/admin/customers/${profile.id}?ordersPage=${initialData.ordersPage - 1}`} className="font-semibold text-[var(--primary)] hover:underline">Previous</Link>}{initialData.ordersPage < initialData.ordersTotalPages && <Link href={`/admin/customers/${profile.id}?ordersPage=${initialData.ordersPage + 1}`} className="font-semibold text-[var(--primary)] hover:underline">Next</Link>}</span></div>}</CardContent></Card>}
      {activeTab === "profile" && <Card><CardHeader><CardTitle className="text-base">Profile details</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-[var(--text-muted)]">Name</p><p className="mt-1 text-sm font-semibold">{profile.name || "Not provided"}</p></div><div><p className="text-xs text-[var(--text-muted)]">Email</p><p className="mt-1 break-all text-sm font-semibold">{profile.email}</p></div><div><p className="text-xs text-[var(--text-muted)]">Phone</p><p className="mt-1 text-sm font-semibold">{profile.phone || "Not provided"}</p></div><div><p className="text-xs text-[var(--text-muted)]">First login</p><p className="mt-1 text-sm font-semibold">{profile.firstLoginAt ? formatDate(profile.firstLoginAt, { dateStyle: "medium", timeStyle: "short" }) : "Never"}</p></div></CardContent></Card>}
      {activeTab === "addresses" && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-[var(--primary)]" />Saved addresses</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{initialData.addresses.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No saved addresses.</p> : initialData.addresses.map((address) => <div key={address.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">{address.label}</p>{address.isDefault && <Badge size="sm" variant="secondary">Default</Badge>}</div><p className="mt-2 text-xs font-semibold">{address.recipientName} · {address.phone}</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{formatCustomerAddress(address)}</p>{address.notes && <p className="mt-1 text-xs text-[var(--text-muted)]">Notes: {address.notes}</p>}</div>)}</CardContent></Card>}
      {activeTab === "cart" && <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4 text-[var(--primary)]" />Current cart</CardTitle></CardHeader><CardContent className="space-y-3">{initialData.cart.items.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Cart is empty.</p> : <>{initialData.cart.items.map((item) => <div key={item.id} className="flex items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.name} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[11px] text-[var(--text-secondary)]">{item.quantity} × {formatMoney(item.unitPrice, currency)}</p></div><Badge size="sm" variant={item.isAvailable ? "success" : "destructive"}>{item.isAvailable ? "Available" : "Unavailable"}</Badge></div>)}<p className="border-t border-[var(--border)] pt-3 text-right text-sm font-black">{formatMoney(initialData.cart.total, currency)}</p></>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4 text-[var(--primary)]" />Favorites</CardTitle></CardHeader><CardContent className="space-y-3">{initialData.favorites.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No saved favorites.</p> : initialData.favorites.map((favorite) => <div key={favorite.id} className="flex items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={favorite.imageUrl ?? undefined} alt={favorite.name} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{favorite.name}</p><p className="text-[11px] text-[var(--text-secondary)]">{formatMoney(favorite.price, currency)}</p></div><Badge size="sm" variant={favorite.isAvailable ? "success" : "warning"}>{favorite.isAvailable ? "Available" : favorite.status}</Badge></div>)}</CardContent></Card></div>}
      {activeTab === "activity" && <Card><CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader><CardContent className="space-y-4">{initialData.activity.map((event) => { const Icon = activityIcon(event.type); return <div key={event.id} className="flex gap-3 text-xs"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)]"><Icon className="h-3.5 w-3.5 text-[var(--primary)]" /></span><div className="min-w-0"><p className="font-semibold">{event.title}</p><p className="mt-0.5 text-[var(--text-secondary)]">{event.description}</p><p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{formatDate(event.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p></div>{event.href && <Link href={event.href} className="ml-auto shrink-0 text-[var(--primary)]">Open</Link>}</div>; })}</CardContent></Card>}
      <Modal isOpen={confirmSuspend} onClose={() => { if (!isSaving) setConfirmSuspend(false); }} title="Suspend customer?" description={`${profile.name || profile.email} will no longer be able to sign in.`} maxWidth="sm"><div className="space-y-5"><p className="text-sm leading-6 text-[var(--text-secondary)]">This is a high-impact action. The customer will lose access to their account until an administrator activates them again.</p>{error && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{error}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirmSuspend(false)}>Cancel</Button><Button type="button" variant="destructive" isLoading={isSaving} onClick={() => void changeStatus("SUSPENDED")}>Suspend Customer</Button></div></div></Modal>
    </div>
  );
}
