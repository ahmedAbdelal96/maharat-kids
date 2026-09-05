import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";

import { ProductImage } from "@/components/ecommerce/product-image";
import { FadeIn } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/formatters";
import { getDashboardOverview } from "@/modules/dashboard/server/queries";
import { orderStatusLabels } from "@/modules/orders/domain/rules";

function statusVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  if (["PAID", "DELIVERED", "COMPLETED"].includes(status)) return "success";
  if (["CANCELLED", "FAILED"].includes(status)) return "destructive";
  if (["PENDING", "UNPAID", "OUT_FOR_DELIVERY"].includes(status)) return "warning";
  return "secondary";
}

function orderStatusLabel(status: string) {
  return orderStatusLabels[status as keyof typeof orderStatusLabels] ?? status;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-4 py-8 text-center text-xs text-[var(--text-secondary)]">{children}</div>;
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const result = await getDashboardOverview();

  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin");
    if (result.error.code === "FORBIDDEN") redirect("/forbidden");
    throw result.error;
  }

  const dashboard = result.data;
  const maxSales = Math.max(...dashboard.sales.map((point) => Number(point.revenue)), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Operations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Store Overview</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">A live view of today&apos;s store activity.</p>
        </div>
        <div className="flex items-center gap-2"><Link href="/admin/products" className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-muted)]">Products</Link><Link href="/admin/orders" className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)]">Orders</Link></div>
      </div>

      <FadeIn duration={0.25}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[var(--text-secondary)]">Revenue</p><p className="mt-2 text-2xl font-black">{formatMoney(dashboard.kpis.revenue.total, dashboard.currency)}</p></div><CircleDollarSign className="h-5 w-5 text-[var(--primary)]" /></div><div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]"><span>Today <strong className="text-[var(--text-primary)]">{formatMoney(dashboard.kpis.revenue.today, dashboard.currency)}</strong></span><span>Month <strong className="text-[var(--text-primary)]">{formatMoney(dashboard.kpis.revenue.month, dashboard.currency)}</strong></span><span>Settled COD <strong className="text-[var(--text-primary)]">{formatMoney(dashboard.kpis.revenue.settledCod, dashboard.currency)}</strong></span></div></Card>
          <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[var(--text-secondary)]">Orders</p><p className="mt-2 text-2xl font-black">{formatNumber(dashboard.kpis.orders.total)}</p></div><ShoppingCart className="h-5 w-5 text-[var(--primary)]" /></div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]"><span>Pending <strong className="text-[var(--text-primary)]">{dashboard.kpis.orders.pending}</strong></span><span>Processing <strong className="text-[var(--text-primary)]">{dashboard.kpis.orders.processing}</strong></span><span>Delivered <strong className="text-[var(--text-primary)]">{dashboard.kpis.orders.delivered}</strong></span></div></Card>
          <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[var(--text-secondary)]">Customers</p><p className="mt-2 text-2xl font-black">{formatNumber(dashboard.kpis.customers.total)}</p></div><Users className="h-5 w-5 text-[var(--primary)]" /></div><p className="mt-3 text-[11px] text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{formatNumber(dashboard.kpis.customers.recent)}</strong> new in the last 30 days</p></Card>
          <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[var(--text-secondary)]">Products</p><p className="mt-2 text-2xl font-black">{formatNumber(dashboard.kpis.products.active)}</p></div><Package className="h-5 w-5 text-[var(--primary)]" /></div><p className="mt-3 text-[11px] text-[var(--text-secondary)]"><strong className="text-[var(--warning)]">{formatNumber(dashboard.kpis.products.lowStock)}</strong> low stock items</p></Card>
        </div>
      </FadeIn>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card><CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="text-base">Recent Orders</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Latest customer transactions</p></div><Link href="/admin/orders" className="text-xs font-semibold text-[var(--primary)]">View all</Link></CardHeader><CardContent className="p-0">{dashboard.recentOrders.length === 0 ? <EmptyState>No orders have been placed yet.</EmptyState> : <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead /></TableRow></TableHeader><TableBody>{dashboard.recentOrders.map((order) => <TableRow key={order.id}><TableCell className="font-mono text-xs font-bold">{order.orderNumber}</TableCell><TableCell><p className="text-xs font-semibold">{order.customerName || order.customerEmail}</p><p className="text-[11px] text-[var(--text-muted)]">{order.customerEmail}</p></TableCell><TableCell className="text-xs font-bold">{formatMoney(order.total, order.currency)}</TableCell><TableCell><Badge size="sm" variant={statusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge></TableCell><TableCell><Badge size="sm" variant={statusVariant(order.fulfillmentStatus)}>{orderStatusLabel(order.fulfillmentStatus)}</Badge></TableCell><TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell><TableCell><Link href={`/admin/orders?order=${order.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">Open <ArrowRight className="h-3 w-3" /></Link></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
        <Card className="border-[var(--warning)]/30 bg-[var(--warning-subtle)]/35"><CardHeader className="flex-row items-center gap-3 pb-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--warning)]/20 text-[var(--warning)]"><AlertTriangle className="h-4 w-4" /></div><div><CardTitle className="text-base">Pending Actions</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Items that may need attention</p></div></CardHeader><CardContent className="space-y-2 pt-0"><Link href="/admin/orders" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>Orders waiting confirmation</span><Badge variant="warning" size="sm">{dashboard.pendingActions.pendingConfirmation}</Badge></Link><Link href="/admin/payments" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>Payments awaiting verification</span><Badge variant="warning" size="sm">{dashboard.pendingActions.pendingVerification}</Badge></Link><Link href="/admin/payments" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>COD settlements pending</span><Badge variant="warning" size="sm">{dashboard.pendingActions.pendingCodSettlements}</Badge></Link><Link href="/admin/shipping" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>With shipping companies</span><Badge variant="warning" size="sm">{dashboard.pendingActions.withCarriers}</Badge></Link><Link href="/admin/shipping" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>COD due from carriers</span><Badge variant="warning" size="sm">{formatMoney(dashboard.pendingActions.codDueFromCarriers, dashboard.currency)}</Badge></Link><Link href="/admin/shipping" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>Returns with carriers</span><Badge variant="warning" size="sm">{dashboard.pendingActions.returnsWithCarriers}</Badge></Link><Link href="/admin/inventory" className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs hover:bg-[var(--surface-muted)]"><span>Low stock products</span><Badge variant={dashboard.pendingActions.lowStockProducts > 0 ? "destructive" : "success"} size="sm">{dashboard.pendingActions.lowStockProducts}</Badge></Link></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="text-base">Sales Overview</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Paid revenue over the last 7 days</p></div><BarChart3 className="h-5 w-5 text-[var(--primary)]" /></CardHeader><CardContent><div className="flex h-48 items-end gap-2 border-b border-l border-[var(--border)] px-2 pb-0 pt-4">{dashboard.sales.map((point) => <div key={point.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-[var(--radius-sm)] bg-[var(--primary)] transition-all" style={{ height: `${Math.max((Number(point.revenue) / maxSales) * 100, Number(point.revenue) > 0 ? 8 : 2)}%` }} title={`${point.label}: ${formatMoney(point.revenue, dashboard.currency)}`} /><span className="text-[10px] text-[var(--text-muted)]">{point.label}</span></div>)}</div><div className="mt-3 text-right text-xs text-[var(--text-secondary)]">Total period: <strong className="text-[var(--text-primary)]">{formatMoney(dashboard.sales.reduce((sum, point) => sum + Number(point.revenue), 0), dashboard.currency)}</strong></div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="text-base">Best Selling Products</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Based on paid order items</p></div><ClipboardList className="h-5 w-5 text-[var(--primary)]" /></CardHeader><CardContent className="space-y-3 pt-0">{dashboard.topProducts.length === 0 ? <EmptyState>No paid product sales yet.</EmptyState> : dashboard.topProducts.map((product) => <div key={product.productId} className="flex items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={product.imageUrl ?? undefined} alt={product.name} aspectRatio="square" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{product.name}</p><p className="text-[11px] text-[var(--text-secondary)]">{formatNumber(product.quantitySold)} sold</p></div><p className="text-xs font-bold">{formatMoney(product.revenue, product.currency)}</p></div>)}</CardContent></Card>
      </div>

      <Card><CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="text-base">Low Stock Products</CardTitle><p className="mt-1 text-xs text-[var(--text-secondary)]">Active products with 5 or fewer units</p></div><Link href="/admin/inventory" className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">Inventory <ArrowRight className="h-3 w-3" /></Link></CardHeader><CardContent className="p-0">{dashboard.lowStockProducts.length === 0 ? <EmptyState>All tracked products are above the low stock threshold.</EmptyState> : <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Current stock</TableHead></TableRow></TableHeader><TableBody>{dashboard.lowStockProducts.map((product) => <TableRow key={product.id}><TableCell><div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={product.imageUrl ?? undefined} alt={product.name} aspectRatio="square" /></div><span className="text-xs font-semibold">{product.name}</span></div></TableCell><TableCell className="font-mono text-xs text-[var(--text-secondary)]">{product.sku || "—"}</TableCell><TableCell className="text-right"><Badge variant={product.stockQuantity === 0 ? "destructive" : "warning"} size="sm">{product.stockQuantity}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    </div>
  );
}
