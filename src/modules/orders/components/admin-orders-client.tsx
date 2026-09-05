"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { ProductImage } from "@/components/ecommerce/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/formatters";
import { allowedOrderStatusTransitions, orderStatusLabels } from "../domain/rules";
import { getAdminOrderDetails, updateOrderStatus, updatePaymentStatus } from "../server/actions";
import { assignShippingCompany, updateShipmentStatus } from "@/modules/shipping/server/actions";
import { allowedShipmentTransitions } from "@/modules/shipping/domain/rules";
import { shipmentStatusLabels } from "@/modules/shipping/constants";
import type { ShippingCompany } from "@/modules/shipping/types";
import type { OrderDetails, OrderSummary } from "../types";

const orderStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
const paymentStatuses = ["UNPAID", "PENDING", "PENDING_VERIFICATION", "PAID", "FAILED", "REFUNDED"] as const;

function statusVariant(value: string): "success" | "destructive" | "warning" {
  return ["PAID", "DELIVERED", "COMPLETED"].includes(value)
    ? "success"
    : ["CANCELLED", "FAILED"].includes(value)
      ? "destructive"
      : "warning";
}

function historyDate(value: string) {
  return formatDate(value, { hour: "numeric", minute: "2-digit" });
}

export function AdminOrdersClient({ initialOrders, initialOrderId, initialShippingCompanies }: { initialOrders: OrderSummary[]; initialOrderId?: string; initialShippingCompanies: ShippingCompany[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selected, setSelected] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [shippingCompanyId, setShippingCompanyId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingBusy, setShippingBusy] = useState(false);

  useEffect(() => {
    if (!initialOrderId) return;
    void open(initialOrderId);
  }, [initialOrderId]);

  const filtered = useMemo(() => orders.filter((order) => {
    const searchable = `${order.orderNumber} ${order.customerName ?? ""} ${order.customerEmail} ${order.customerPhone ?? ""}`.toLowerCase();
    return searchable.includes(search.toLowerCase())
      && (statusFilter === "ALL" || order.status === statusFilter)
      && (paymentFilter === "ALL" || order.paymentStatus === paymentFilter);
  }), [orders, search, statusFilter, paymentFilter]);

  async function open(orderId: string) {
    setError("");
    setMessage("");
    const result = await getAdminOrderDetails(orderId);
    if (result.success) setSelected(result.data);
    else setError(result.error.message);
  }

  async function changeStatus(orderId: string, status: typeof orderStatuses[number]) {
    setError("");
    const result = await updateOrderStatus({ orderId, status });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, status: result.data.status, paymentStatus: result.data.paymentStatus }
      : order));
    setSelected(result.data);
    setMessage(`Order status updated to ${orderStatusLabels[result.data.status]}.`);
  }

  async function changePayment(orderId: string, status: typeof paymentStatuses[number]) {
    setError("");
    const result = await updatePaymentStatus({ orderId, status });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, paymentStatus: result.data.paymentStatus }
      : order));
    setSelected(result.data);
    setMessage(`Payment status updated to ${result.data.paymentStatus}.`);
  }

  async function assignCarrier() {
    if (!selected || !shippingCompanyId) return;
    setShippingBusy(true); setError("");
    const result = await assignShippingCompany({ orderId: selected.id, shippingCompanyId, trackingNumber });
    if (!result.success) setError(result.error.message); else { setSelected({ ...selected, shippingCompanyName: result.data.shippingCompanyName, shippingStatus: result.data.status, trackingNumber: result.data.trackingNumber }); setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, shippingCompanyName: result.data.shippingCompanyName, shippingStatus: result.data.status, trackingNumber: result.data.trackingNumber } : order)); setMessage("Shipping company assigned."); }
    setShippingBusy(false);
  }

  async function changeShipment(status: NonNullable<OrderSummary["shippingStatus"]>) {
    if (!selected) return;
    setShippingBusy(true); setError("");
    const result = await updateShipmentStatus({ orderId: selected.id, status });
    if (!result.success) setError(result.error.message); else { const nextOrderStatus = status === "WITH_CARRIER" ? "SHIPPED" : status === "OUT_FOR_DELIVERY" ? "OUT_FOR_DELIVERY" : status === "DELIVERED" ? "DELIVERED" : selected.status; setSelected({ ...selected, status: nextOrderStatus, shippingStatus: result.data.status, paymentStatus: status === "DELIVERED" && selected.paymentStatus === "UNPAID" ? "PAID" : selected.paymentStatus }); setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, shippingStatus: result.data.status, status: nextOrderStatus, paymentStatus: status === "DELIVERED" && order.paymentStatus === "UNPAID" ? "PAID" : order.paymentStatus } : order)); setMessage(`Shipment updated to ${shipmentStatusLabels[result.data.status]}.`); }
    setShippingBusy(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders ({filtered.length})</h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Manage fulfillment status while keeping payment state separate.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, email, phone..." className="pl-9 text-xs" /></div>
        <select aria-label="Filter orders by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"><option value="ALL">All order statuses</option>{orderStatuses.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select>
        <select aria-label="Filter orders by payment status" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"><option value="ALL">All payment statuses</option>{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      </div>

      {(error || message) && <p role="alert" className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${error ? "bg-[var(--destructive-subtle)] text-[var(--destructive)]" : "bg-[var(--success-subtle)] text-[var(--success)]"}`}>{error || message}</p>}

      <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Created</TableHead><TableHead>Order status</TableHead><TableHead>Shipment</TableHead><TableHead>Payment status</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>{filtered.map((order) => <TableRow key={order.id}><TableCell className="font-mono text-xs font-bold">{order.orderNumber}</TableCell><TableCell><p className="text-xs font-semibold">{order.customerName || order.customerEmail}</p><p className="text-[11px] text-[var(--text-muted)]">{order.customerEmail}</p>{order.customerPhone && <p className="text-[11px] text-[var(--text-muted)]">{order.customerPhone}</p>}</TableCell><TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell><TableCell><Badge variant={statusVariant(order.status)} size="sm">{orderStatusLabels[order.status]}</Badge></TableCell><TableCell>{order.shippingStatus ? <><Badge variant={statusVariant(order.shippingStatus)} size="sm">{shipmentStatusLabels[order.shippingStatus]}</Badge><p className="mt-1 text-[11px] text-[var(--text-muted)]">{order.shippingCompanyName || "No company"}</p></> : <span className="text-[11px] text-[var(--text-muted)]">No shipment</span>}</TableCell><TableCell><Badge variant={statusVariant(order.paymentStatus)} size="sm">{order.paymentStatus}</Badge></TableCell><TableCell className="text-right text-xs font-bold">{formatMoney(order.total, order.currency)}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => open(order.id)}>View</Button></TableCell></TableRow>)}</TableBody></Table>
      {filtered.length === 0 && <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">No orders match the selected filters.</div>}

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title={selected?.orderNumber} description="Order snapshot, fulfillment history, and payment management." maxWidth="2xl">
        {selected && <div className="space-y-5 text-sm"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-[var(--text-secondary)]">Customer</p><p className="font-semibold">{selected.customerName || selected.customerEmail}</p><p className="text-xs text-[var(--text-secondary)]">{selected.customerEmail}</p>{selected.customerPhone && <p className="text-xs text-[var(--text-secondary)]">{selected.customerPhone}</p>}</div><div><p className="text-xs text-[var(--text-secondary)]">Saved order address</p><p className="text-xs leading-5 text-[var(--text-secondary)]">{selected.shippingAddress.recipientName} · {selected.shippingAddress.phone}<br />{[selected.shippingAddress.street, selected.shippingAddress.building, selected.shippingAddress.area, selected.shippingAddress.city, selected.shippingAddress.governorate, selected.shippingAddress.country].filter(Boolean).join(", ")}</p></div></div><div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold">Shipping operations</p><Link href="/admin/shipping" className="text-xs font-semibold text-[var(--primary)]">Open shipping</Link></div>{selected.shippingStatus ? <><div className="flex flex-wrap items-center gap-2 text-xs"><Badge variant="warning" size="sm">{shipmentStatusLabels[selected.shippingStatus]}</Badge><span className="text-[var(--text-secondary)]">{selected.shippingCompanyName || "No company"}</span>{selected.trackingNumber && <span className="font-mono text-[var(--text-muted)]">{selected.trackingNumber}</span>}</div><div className="flex flex-wrap gap-2">{allowedShipmentTransitions(selected.shippingStatus).filter((status) => status !== "DELIVERY_FAILED").map((status) => <Button key={status} size="sm" variant="outline" isLoading={shippingBusy} onClick={() => changeShipment(status)}>{shipmentStatusLabels[status]}</Button>)}</div></> : <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select aria-label="Assign shipping company" value={shippingCompanyId} onChange={(event) => setShippingCompanyId(event.target.value)} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="">Assign company</option>{initialShippingCompanies.filter((company) => company.isActive).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Tracking number" className="h-9 text-xs" /><Button size="sm" isLoading={shippingBusy} disabled={!shippingCompanyId} onClick={assignCarrier}>Assign</Button></div>}</div><div className="space-y-2 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold">Items</p>{selected.items.map((item) => <div key={item.id} className="flex items-center gap-3 text-xs"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" /></div><span className="min-w-0 flex-1 truncate">{item.name} × {item.quantity}</span><span>{formatMoney(item.lineTotal, selected.currency)}</span></div>)}</div><div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2"><label className="text-xs font-semibold">Order status<select aria-label="Change order status" value={selected.status} onChange={(event) => changeStatus(selected.id, event.target.value as typeof orderStatuses[number])} className="mt-1 block h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value={selected.status}>{orderStatusLabels[selected.status]}</option>{allowedOrderStatusTransitions(selected.status).map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label><label className="text-xs font-semibold">Payment status<select aria-label="Change payment status" value={selected.paymentStatus} onChange={(event) => changePayment(selected.id, event.target.value as typeof paymentStatuses[number])} className="mt-1 block h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs">{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"><p className="text-xs font-bold">Fulfillment timeline</p><div className="mt-2 space-y-2">{selected.history.map((entry) => <div key={entry.id} className="flex gap-2 text-xs"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" /><div><p className="font-semibold">{entry.oldStatus ? `${orderStatusLabels[entry.oldStatus]} → ` : ""}{orderStatusLabels[entry.newStatus]}</p><p className="text-[var(--text-muted)]">{historyDate(entry.createdAt)} · {entry.changedByName || entry.changedByEmail}</p>{entry.note && <p className="text-[var(--text-secondary)]">{entry.note}</p>}</div></div>)}</div></div><div className="flex justify-between border-t border-[var(--border)] pt-4 font-bold"><span>Total</span><span>{formatMoney(selected.total, selected.currency)}</span></div></div>}
      </Modal>
    </div>
  );
}
