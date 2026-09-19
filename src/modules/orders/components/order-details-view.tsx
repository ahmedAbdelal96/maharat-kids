import { Link } from "@/i18n/navigation";
import { CheckCircle2, Clock3, CreditCard, MapPin, PackageCheck } from "lucide-react";

import { ProductImage } from "@/components/ecommerce/product-image";
import { FadeIn } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/formatters";
import { formatCustomerAddress } from "@/modules/customers/address";
import { orderStatusLabels } from "../domain/rules";
import type { OrderDetails } from "../types";
import { CustomerReturnRequestForm } from "@/modules/returns/components/customer-return-request-form";
import type { EligibleReturnItem } from "@/modules/returns/types";
import type { CustomerReviewsPage } from "@/modules/reviews/types";

const orderTimeline = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"] as const;

function orderStatusVariant(status: string): "success" | "warning" | "destructive" {
  if (["DELIVERED", "COMPLETED"].includes(status)) return "success";
  if (status === "CANCELLED") return "destructive";
  return "warning";
}

export function OrderDetailsView({ order, returnEligibility, reviewData, currency = order.currency }: { order: OrderDetails; returnEligibility?: { orderNumber: string; eligibleUntil: string | null; policy: { enabled: boolean; windowDays: number; policyText: string }; items: EligibleReturnItem[] } | null; reviewData?: CustomerReviewsPage | null; currency?: string }) {
  const whatsApp = order.confirmationWhatsApp ? `https://wa.me/${order.confirmationWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I am sending payment confirmation for order ${order.orderNumber}.`)}` : null;
  const currentStep = orderTimeline.indexOf(order.status as (typeof orderTimeline)[number]);
  const isManualTransfer = order.paymentStatus === "PENDING" || order.paymentStatus === "PENDING_VERIFICATION";

  return (
    <FadeIn className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold text-[var(--primary)]">Order details</p><h1 className="mt-1 break-all text-2xl font-extrabold tracking-tight">#{order.orderNumber}</h1><p className="mt-1 text-xs text-[var(--text-secondary)]">Placed on {formatDate(order.createdAt)}</p></div>
        <div className="flex flex-wrap gap-2"><Badge variant={orderStatusVariant(order.status)}>{orderStatusLabels[order.status]}</Badge><Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>{order.paymentStatus}</Badge></div>
      </div>

      {order.status !== "CANCELLED" ? <Card><CardHeader><CardTitle className="text-base">Delivery progress</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-7">{orderTimeline.map((step, index) => <div key={step} className={`flex items-center gap-3 text-xs sm:block sm:text-center ${index <= currentStep ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:mx-auto ${index <= currentStep ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] bg-[var(--surface-muted)]"}`}>{index <= currentStep ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</div><p className="font-semibold sm:mt-2">{orderStatusLabels[step]}</p></div>)}</div></CardContent></Card> : <div className="rounded-[var(--radius-lg)] bg-[var(--destructive-subtle)] px-4 py-3 text-sm text-[var(--destructive)]">This order was cancelled.</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card><CardHeader><CardTitle className="text-base">Products</CardTitle></CardHeader><CardContent className="space-y-1">{order.items.map((item) => { const review = reviewData?.reviews.find((entry) => entry.productId === item.productId); const toReview = reviewData?.toReview.find((entry) => entry.productId === item.productId); const canReview = ["DELIVERED", "COMPLETED"].includes(order.status) && ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus) && !item.isPromotionGift && (review || toReview); return <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] py-3 last:border-0"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Quantity: {item.quantity} · {formatMoney(item.unitPrice, order.currency)} each</p></div><div className="flex items-center gap-3"><p className="text-sm font-bold">{formatMoney(item.lineTotal, order.currency)}</p>{canReview && (review?.productSlug || toReview?.productSlug) ? <Link href={`/products/${review?.productSlug ?? toReview?.productSlug}`} className="text-xs font-semibold text-[var(--primary)] hover:underline">{review ? "View / Edit Review" : "Write a Review"}</Link> : null}</div></div>; })}<div className="space-y-2 border-t border-[var(--border)] pt-4 text-sm"><div className="flex justify-between"><span className="text-[var(--text-secondary)]">Subtotal</span><span>{formatMoney(order.subtotal, order.currency)}</span></div>{Number(order.promotionDiscount) > 0 && <div className="flex justify-between text-[var(--primary)]"><span>Automatic offer</span><span>-{formatMoney(order.promotionDiscount, order.currency)}</span></div>}{Number(order.couponDiscount) > 0 && order.coupon && <div className="flex justify-between text-[var(--accent)]"><span>Coupon {order.coupon.couponCode}</span><span>-{formatMoney(order.couponDiscount, order.currency)}</span></div>}<div className="flex justify-between"><span className="text-[var(--text-secondary)]">Shipping</span><span>{formatMoney(order.shippingAmount, order.currency)}</span></div><div className="flex justify-between text-base font-extrabold"><span>Total</span><span className="text-[var(--primary)]">{formatMoney(order.total, order.currency)}</span></div></div></CardContent></Card>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-[var(--primary)]" />Delivery</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-[var(--text-secondary)]"><p className="font-semibold text-[var(--text-primary)]">{order.shippingAddress.recipientName} · {order.shippingAddress.phone}</p><p>{formatCustomerAddress(order.shippingAddress)}</p>{order.shippingAddress.notes && <p className="mt-2"><span className="font-semibold text-[var(--text-primary)]">Notes:</span> {order.shippingAddress.notes}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-[var(--primary)]" />Payment</CardTitle></CardHeader><CardContent className="text-xs text-[var(--text-secondary)]"><p className="font-semibold text-[var(--text-primary)]">{order.paymentMethodName}</p><p className="mt-1">Status: {order.paymentStatus}</p>{order.paymentDestination && <p className="mt-1">Transfer to: {order.paymentDestination}</p>}{order.paymentInstructions && <p className="mt-1">{order.paymentInstructions}</p>}{order.paymentStatus === "UNPAID" && <p className="mt-1">Pay when delivered.</p>}{isManualTransfer && whatsApp && <a href={whatsApp} target="_blank" rel="noreferrer"><Button variant="accent" size="sm" className="mt-3">Send confirmation</Button></a>}</CardContent></Card>
        </div>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Status history</CardTitle></CardHeader><CardContent><div className="space-y-4">{order.history.map((entry) => <div key={entry.id} className="flex gap-3 text-xs"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" /><div><p className="font-semibold">{entry.oldStatus ? `${orderStatusLabels[entry.oldStatus]} → ` : ""}{orderStatusLabels[entry.newStatus]}</p><p className="mt-1 text-[var(--text-muted)]">{formatDate(entry.createdAt, { hour: "numeric", minute: "2-digit" })}</p>{entry.note && <p className="mt-1 text-[var(--text-secondary)]">{entry.note}</p>}</div></div>)}</div></CardContent></Card>
      {returnEligibility && <CustomerReturnRequestForm eligibility={returnEligibility} currency={currency} />}
      <Link href="/account"><Button variant="outline" className="gap-2"><PackageCheck className="h-4 w-4" />Back to Account</Button></Link>
    </FadeIn>
  );
}
