"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { moderateProductReview } from "../server/actions";
import type { AdminReviewsPage } from "../types";

export function AdminReviewsClient({ initialData }: { initialData: AdminReviewsPage }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function moderate(reviewId: string, nextStatus: "APPROVED" | "REJECTED", nextReason: string | null = null) {
    setSaving(true); setMessage("");
    const result = await moderateProductReview({ reviewId, status: nextStatus, reason: nextReason });
    setSaving(false);
    if (!result.success) { setMessage(result.error.message); return; }
    setData((current) => { const previous = current.items.find((item) => item.id === reviewId)?.status; return { ...current, items: current.items.map((item) => item.id === reviewId ? { ...item, status: nextStatus, customerVisibleModerationReason: nextReason } : item), counts: previous === nextStatus ? current.counts : { ...current.counts, [nextStatus]: current.counts[nextStatus] + 1, ...(previous ? { [previous]: Math.max(0, current.counts[previous] - 1) } : {}) } }; });
    setRejecting(null); setReason(""); router.refresh();
  }

  const filtered = data.items.filter((item) => status === "ALL" || item.status === status).filter((item) => !search.trim() || [item.productName, item.customerEmail, item.orderNumber, item.comment ?? ""].some((value) => value?.toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-[var(--primary)]">Customer feedback</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Reviews</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Moderate verified purchase reviews before they appear in the storefront.</p></div></div>{message && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] p-3 text-xs text-[var(--destructive)]">{message}</p>}<div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Pending</p><p className="mt-1 text-2xl font-extrabold">{data.counts.PENDING}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Published</p><p className="mt-1 text-2xl font-extrabold">{data.counts.APPROVED}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Rejected</p><p className="mt-1 text-2xl font-extrabold">{data.counts.REJECTED}</p></CardContent></Card></div><Card><CardHeader><CardTitle className="text-base">Moderation queue</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, customer, order..." /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Published</option><option value="REJECTED">Rejected</option></select></div>{filtered.length === 0 ? <p className="rounded border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">No reviews match these filters.</p> : <Table><TableHeader><TableRow><TableHead>Review</TableHead><TableHead>Purchase</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{filtered.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold">{item.productName}</p><p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">{item.comment || "No comment"}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.customerName || item.customerEmail}</p></TableCell><TableCell><Link href={`/admin/orders?order=${encodeURIComponent(item.orderNumber)}`} className="text-xs font-semibold text-[var(--primary)] hover:underline">#{item.orderNumber}</Link><p className="text-[11px] text-[var(--text-muted)]">{item.orderStatus}</p></TableCell><TableCell>{item.rating}/5</TableCell><TableCell><Badge variant={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "destructive" : "warning"} size="sm">{item.status}</Badge></TableCell><TableCell className="text-right">{item.status === "PENDING" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => void moderate(item.id, "APPROVED")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => setRejecting(item.id)}>Reject</Button></div> : <Button size="sm" variant="outline" onClick={() => item.status === "REJECTED" ? setRejecting(item.id) : void moderate(item.id, "REJECTED", "This review needs an update before it can be published.")}>Re-moderate</Button>}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card><Modal isOpen={rejecting !== null} onClose={() => { if (!saving) setRejecting(null); }} title="Reject review" description="Give the customer a clear reason they can act on." maxWidth="md"><div className="space-y-4"><label className="block text-xs font-semibold">Reason<Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Please remove personal information..." /></label><div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" disabled={saving || !reason.trim()} isLoading={saving} onClick={() => rejecting && void moderate(rejecting, "REJECTED", reason.trim())}>Reject Review</Button></div></div></Modal></div>;
}
