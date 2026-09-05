import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CouponForm } from "@/modules/coupons/components/coupon-form";
import { getAdminCoupon } from "@/modules/coupons/server/queries";

export default async function AdminCouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const result = await getAdminCoupon(id);
  if (!result.success) { if (result.error.code === "UNAUTHENTICATED") redirect(`/login?callbackUrl=/admin/coupons/${id}`); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); if (result.error.code === "NOT_FOUND") notFound(); throw result.error; }
  const coupon = result.data;
  return <div className="space-y-6"><div className="flex items-center gap-3"><Link href="/admin/coupons"><Button size="icon" variant="ghost" aria-label="Back to coupons"><ArrowLeft className="h-4 w-4" /></Button></Link><div><p className="font-mono text-xs text-[var(--primary)]">{coupon.code}</p><h1 className="text-2xl font-bold">{coupon.name}</h1></div><div className="ml-auto"><Badge variant={coupon.status === "ACTIVE" ? "success" : "outline"}>{coupon.status}</Badge></div></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Total uses</p><p className="mt-2 text-2xl font-bold">{coupon.redeemedCount}{coupon.totalUsageLimit == null ? "" : ` / ${coupon.totalUsageLimit}`}</p></Card><Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Customers used</p><p className="mt-2 text-2xl font-bold">{coupon.uniqueCustomerCount ?? 0}</p></Card><Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Discount given</p><p className="mt-2 text-2xl font-bold">{coupon.discountGiven ?? "0.00"}</p></Card></div>
    <CouponForm initial={coupon} />
    <Card><CardHeader><CardTitle className="text-base">Usage history</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead><tr className="border-b border-[var(--border)] text-[var(--text-muted)]"><th className="px-2 py-3">Customer</th><th className="px-2 py-3">Order</th><th className="px-2 py-3">Discount</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Used at</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{coupon.redemptions.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-[var(--text-muted)]">No redemption history yet.</td></tr> : coupon.redemptions.map((redemption) => <tr key={redemption.id}><td className="px-2 py-3"><Link className="font-semibold hover:underline" href={`/admin/customers/${redemption.customerId}`}>{redemption.customerName ?? redemption.customerEmail}</Link><span className="block text-[var(--text-muted)]">{redemption.customerEmail}</span></td><td className="px-2 py-3"><Link className="font-semibold hover:underline" href={`/admin/orders?order=${redemption.orderId}`}>{redemption.orderNumber}</Link></td><td className="px-2 py-3">{redemption.discountAmount}</td><td className="px-2 py-3"><Badge variant={redemption.status === "REDEEMED" ? "success" : "outline"} size="sm">{redemption.status}</Badge></td><td className="px-2 py-3 text-[var(--text-secondary)]">{new Date(redemption.redeemedAt).toLocaleString()}</td></tr>)}</tbody></table></div></CardContent></Card>
  </div>;
}
