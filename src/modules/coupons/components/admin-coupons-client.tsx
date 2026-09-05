"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { CouponForm } from "./coupon-form";
import { deleteCoupon } from "../server/actions";
import type { Coupon, CouponStatus } from "../types";
import { COUPON_STATUS_LABELS, COUPON_TYPE_LABELS } from "../constants";

function badge(status: CouponStatus) { return <Badge variant={status === "ACTIVE" ? "success" : status === "INACTIVE" ? "outline" : "secondary"} size="sm">{COUPON_STATUS_LABELS[status]}</Badge>; }

export function AdminCouponsClient({ coupons }: { coupons: Coupon[] }) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const [status, setStatus] = useState<CouponStatus | "ALL">("ALL"); const [busy, startTransition] = useTransition(); const [error, setError] = useState("");
  const filtered = coupons.filter((coupon) => (!search || `${coupon.name} ${coupon.code}`.toLowerCase().includes(search.toLowerCase())) && (status === "ALL" || coupon.status === status));
  const totals = { active: coupons.filter((c) => c.status === "ACTIVE").length, scheduled: coupons.filter((c) => c.status === "SCHEDULED").length, uses: coupons.reduce((sum, c) => sum + c.redeemedCount, 0) };
  function remove(coupon: Coupon) { if (!window.confirm(`Delete unused coupon ${coupon.code}?`)) return; startTransition(async () => { const result = await deleteCoupon(coupon.id); if (!result.success) setError(result.error.message); else window.location.reload(); }); }
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Commercial tools</p><h1 className="text-2xl font-bold tracking-tight">Coupons</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Create clear code-based savings and keep usage history intact.</p></div><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New coupon</Button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Active coupons</p><p className="mt-2 text-2xl font-bold">{totals.active}</p></Card><Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Scheduled</p><p className="mt-2 text-2xl font-bold">{totals.scheduled}</p></Card><Card className="col-span-2 p-4 lg:col-span-1"><p className="text-xs text-[var(--text-muted)]">Redeemed uses</p><p className="mt-2 text-2xl font-bold">{totals.uses}</p></Card></div>
    <div className="flex flex-col gap-3 sm:flex-row"><input aria-label="Search coupons" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or code" className="h-10 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--border-focus)]" /><select aria-label="Filter coupon status" value={status} onChange={(e) => setStatus(e.target.value as CouponStatus | "ALL")} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="ALL">All statuses</option>{Object.keys(COUPON_STATUS_LABELS).map((key) => <option key={key} value={key}>{COUPON_STATUS_LABELS[key as CouponStatus]}</option>)}</select></div>
    {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}
    <Card><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]"><tr><th className="px-4 py-3">Coupon</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{filtered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-[var(--text-muted)]"><Tag className="mx-auto mb-2 h-5 w-5" />No coupons found.</td></tr> : filtered.map((coupon) => <tr key={coupon.id} className="hover:bg-[var(--surface-muted)]/40"><td className="px-4 py-3"><Link href={`/admin/coupons/${coupon.id}`} className="font-bold hover:underline">{coupon.name}</Link><p className="mt-1 font-mono text-[var(--primary)]">{coupon.code}</p></td><td className="px-4 py-3">{coupon.type === "PERCENTAGE" ? `${coupon.percentageDiscount}%` : `${coupon.fixedDiscountAmount} fixed`}<p className="mt-1 text-[var(--text-muted)]">{COUPON_TYPE_LABELS[coupon.type]}</p></td><td className="px-4 py-3">{badge(coupon.status)}</td><td className="px-4 py-3">{coupon.totalUsageLimit == null ? `${coupon.redeemedCount} / Unlimited` : `${coupon.redeemedCount} / ${coupon.totalUsageLimit}`}</td><td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(coupon.startsAt).toLocaleDateString()}{coupon.endsAt ? ` - ${new Date(coupon.endsAt).toLocaleDateString()}` : ""}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link href={`/admin/coupons/${coupon.id}`}><Button size="sm" variant="outline">View</Button></Link>{coupon.redeemedCount === 0 && <Button aria-label={`Delete ${coupon.code}`} size="icon" variant="ghost" disabled={busy} onClick={() => remove(coupon)}><Trash2 className="h-4 w-4 text-[var(--destructive)]" /></Button>}</div></td></tr>)}</tbody></table></div></Card>
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Create coupon" description="Set a code, discount, and usage rules for your store." className="max-h-[calc(100vh-2rem)] overflow-y-auto"><CouponForm onCreated={() => setOpen(false)} /></Modal>
  </div>;
}
