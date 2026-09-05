"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProductImage } from "@/components/ecommerce/product-image";
import { formatDate, formatMoney } from "@/lib/formatters";
import { returnReasons } from "../constants";
import { requestReturn } from "../server/actions";

type Eligibility = { orderNumber: string; eligibleUntil: string | null; policy: { enabled: boolean; windowDays: number; policyText: string }; items: Array<{ orderItemId: string; productName: string; imageUrl: string | null; orderQuantity: number; unitPrice: string; returnableQuantity: number; isPromotionGift: boolean; calculatedRefundAmount: string }> };

export function CustomerReturnRequestForm({ eligibility, currency }: { eligibility: Eligibility; currency: string }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("DAMAGED");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedItems = useMemo(() => eligibility.items.filter((item) => (quantities[item.orderItemId] ?? 0) > 0), [eligibility.items, quantities]);
  const estimate = selectedItems.reduce((sum, item) => {
    const quantity = quantities[item.orderItemId] ?? 0;
    const perUnit = item.returnableQuantity > 0 ? Number(item.calculatedRefundAmount) / item.returnableQuantity : 0;
    return sum + perUnit * quantity;
  }, 0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setMessage("");
    const result = await requestReturn({ orderNumber: eligibility.orderNumber, reason, customerNote: note, items: selectedItems.map((item) => ({ orderItemId: item.orderItemId, quantity: quantities[item.orderItemId] })) });
    if (result.success) router.push(`/account/returns/${result.data.id}`);
    else setMessage(result.error.message);
    setIsSaving(false);
  }

  if (!eligibility.policy.enabled || eligibility.items.length === 0) return null;

  return <Card id="request-return"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><RotateCcw className="h-4 w-4 text-[var(--primary)]" />Request a return</CardTitle><p className="text-xs text-[var(--text-secondary)]">Select the items you would like to return. Our team will review the request.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><div className="space-y-2">{eligibility.items.map((item) => <div key={item.orderItemId} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.productName} aspectRatio="square" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.productName}</p><p className="text-xs text-[var(--text-secondary)]">Purchased {item.orderQuantity} · {item.returnableQuantity} available to return</p></div><select aria-label={`Quantity for ${item.productName}`} value={quantities[item.orderItemId] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.orderItemId]: Number(event.target.value) }))} className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value={0}>Keep</option>{Array.from({ length: item.returnableQuantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></div>)}</div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs">{returnReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Estimated refund</p><p className="mt-1 text-lg font-extrabold">{formatMoney(estimate.toFixed(2), currency)}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">Final amount reflects the original paid price and promotions.</p></div></div><label className="block text-xs font-semibold">Note <span className="font-normal text-[var(--text-muted)]">(optional)</span><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell us anything helpful about the return" rows={3} /></label>{eligibility.eligibleUntil && <p className="text-xs text-[var(--text-secondary)]">Eligible for return until <strong>{formatDate(eligibility.eligibleUntil)}</strong>.</p>}{eligibility.policy.policyText && <p className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--text-secondary)]">{eligibility.policy.policyText}</p>}{message && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]">{message}</p>}<Button type="submit" disabled={selectedItems.length === 0 || isSaving} isLoading={isSaving}>Submit return request</Button></form></CardContent></Card>;
}
