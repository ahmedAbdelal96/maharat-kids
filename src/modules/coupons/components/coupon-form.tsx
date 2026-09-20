"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Coupon } from "../types";
import { createCoupon, updateCoupon } from "../server/actions";

function localDate(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16); }

export function CouponForm({ initial, onCreated }: { initial?: Coupon; onCreated?: (coupon: Coupon) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">(initial?.type ?? "PERCENTAGE");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: initial?.name ?? "", code: initial?.code ?? "", percentageDiscount: initial?.percentageDiscount ?? "10", saFixed: initial?.marketRules?.SAUDI_ARABIA.fixedDiscountAmount ?? "", egFixed: initial?.marketRules?.EGYPT.fixedDiscountAmount ?? "", saMinimum: initial?.marketRules?.SAUDI_ARABIA.minimumOrderSubtotal ?? "0", egMinimum: initial?.marketRules?.EGYPT.minimumOrderSubtotal ?? "0", saMaximum: initial?.marketRules?.SAUDI_ARABIA.maximumDiscountAmount ?? "", egMaximum: initial?.marketRules?.EGYPT.maximumDiscountAmount ?? "", startsAt: localDate(initial?.startsAt), endsAt: localDate(initial?.endsAt), hasEnd: Boolean(initial?.endsAt), totalUsageLimit: initial?.totalUsageLimit?.toString() ?? "", perCustomerUsageLimit: initial?.perCustomerUsageLimit?.toString() ?? "", isActive: initial?.isActive ?? true, canCombineWithPromotions: initial?.canCombineWithPromotions ?? false });
  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const payload = { ...form, type, startsAt: new Date(form.startsAt), endsAt: form.hasEnd ? new Date(form.endsAt) : null, percentageDiscount: type === "PERCENTAGE" ? form.percentageDiscount : null, fixedDiscountAmount: null, maximumDiscountAmount: null, minimumOrderSubtotal: 0, marketRules: { SAUDI_ARABIA: { fixedDiscountAmount: type === "FIXED_AMOUNT" ? form.saFixed : null, minimumOrderSubtotal: form.saMinimum || "0", maximumDiscountAmount: type === "PERCENTAGE" ? form.saMaximum || null : null }, EGYPT: { fixedDiscountAmount: type === "FIXED_AMOUNT" ? form.egFixed : null, minimumOrderSubtotal: form.egMinimum || "0", maximumDiscountAmount: type === "PERCENTAGE" ? form.egMaximum || null : null } }, totalUsageLimit: form.totalUsageLimit || null, perCustomerUsageLimit: form.perCustomerUsageLimit || null };
    startTransition(async () => {
      const result = initial ? await updateCoupon({ ...payload, id: initial.id }) : await createCoupon(payload);
      if (!result.success) setError(result.error.message);
      else if (initial) { setMessage("Coupon updated."); router.refresh(); }
      else { onCreated?.(result.data); router.push(`/admin/coupons/${result.data.id}`); }
    });
  }

  return <form onSubmit={submit} className="space-y-4">
    <Card><CardHeader><CardTitle className="text-base">Coupon details</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Name<Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Welcome Campaign" /></label>
      <label className="text-xs font-semibold">Code<Input required value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
      <label className="text-xs font-semibold">Type<select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option></select></label>
      <label className="text-xs font-semibold">Percentage<Input required={type === "PERCENTAGE"} disabled={type !== "PERCENTAGE"} type="number" min="0" step="0.01" value={form.percentageDiscount} onChange={(e) => set("percentageDiscount", e.target.value)} /></label>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Market money rules</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      {([ ["Saudi Arabia — SAR", "sa"], ["Egypt — EGP", "eg"] ] as const).map(([label, prefix]) => <fieldset key={prefix} className="space-y-3 rounded border p-3"><legend className="px-1 text-xs font-semibold">{label}</legend>{type === "FIXED_AMOUNT" && <label className="text-xs font-semibold">Fixed discount<Input required type="number" min="0.01" step="0.01" value={form[`${prefix}Fixed`]} onChange={(e) => set(`${prefix}Fixed`, e.target.value)} /></label>}<label className="text-xs font-semibold">Minimum spend<Input type="number" min="0" step="0.01" value={form[`${prefix}Minimum`]} onChange={(e) => set(`${prefix}Minimum`, e.target.value)} /></label>{type === "PERCENTAGE" && <label className="text-xs font-semibold">Maximum discount <span className="font-normal text-[var(--text-muted)]">optional</span><Input type="number" min="0" step="0.01" value={form[`${prefix}Maximum`]} onChange={(e) => set(`${prefix}Maximum`, e.target.value)} /></label>}</fieldset>)}
    </CardContent></Card><Card><CardHeader><CardTitle className="text-base">Conditions and limits</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Total uses <span className="font-normal text-[var(--text-muted)]">blank = unlimited</span><Input type="number" min="1" step="1" value={form.totalUsageLimit} onChange={(e) => set("totalUsageLimit", e.target.value)} /></label>
      <label className="text-xs font-semibold">Uses per customer <span className="font-normal text-[var(--text-muted)]">blank = unlimited</span><Input type="number" min="1" step="1" value={form.perCustomerUsageLimit} onChange={(e) => set("perCustomerUsageLimit", e.target.value)} /></label>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Schedule and combination</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Starts at<Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></label>
      <label className="text-xs font-semibold">Ends at <span className="font-normal text-[var(--text-muted)]">optional</span><Input type="datetime-local" disabled={!form.hasEnd} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></label>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.hasEnd} onChange={(e) => set("hasEnd", e.target.checked)} /> Set an end date</label>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
      <label className="flex items-start gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" checked={form.canCombineWithPromotions} onChange={(e) => set("canCombineWithPromotions", e.target.checked)} /><span>Can combine with automatic offers <span className="block font-normal text-[var(--text-muted)]">When disabled, the better single discount is used.</span></span></label>
    </CardContent></Card>
    {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}
    {message && <p role="status" className="rounded-[var(--radius-md)] bg-[var(--success-subtle)] px-3 py-2 text-xs text-[var(--success)]">{message}</p>}
    <Button type="submit" isLoading={pending}>{initial ? "Save changes" : "Create coupon"}</Button>
  </form>;
}
