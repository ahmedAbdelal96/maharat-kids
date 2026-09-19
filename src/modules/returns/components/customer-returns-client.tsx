"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/formatters";
import { returnStatusLabels } from "../constants";
import { cancelReturn } from "../server/actions";
import type { ReturnDetails, ReturnSummary } from "../types";

function variant(status: string): "success" | "warning" | "destructive" { if (["COMPLETED", "RECEIVED"].includes(status)) return "success"; if (["REJECTED", "CANCELLED"].includes(status)) return "destructive"; return "warning"; }

export function CustomerReturnsList({ returns, currency }: { returns: ReturnSummary[]; currency: string }) {
  if (returns.length === 0) return <Card><CardContent className="flex flex-col items-center py-12 text-center"><RotateCcw className="h-8 w-8 text-[var(--primary)]" /><h2 className="mt-3 text-base font-bold">No return requests yet</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Eligible returns will appear here after you submit one.</p><Link href="/account/orders"><Button className="mt-5">View orders</Button></Link></CardContent></Card>;
  return <div className="grid gap-3">{returns.map((item) => <Link key={item.id} href={`/account/returns/${item.id}`} className="group"><Card className="transition-colors group-hover:border-[var(--primary)]/40"><CardContent className="flex flex-wrap items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.returnNumber}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Order #{item.orderNumber} · {formatDate(item.requestedAt)}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{item.requestedQuantity} item(s) · {item.reason.replaceAll("_", " ")}</p></div><Badge variant={variant(item.status)} size="sm">{returnStatusLabels[item.status]}</Badge><p className="text-sm font-extrabold">{formatMoney(item.estimatedRefundAmount, currency)}</p></CardContent></Card></Link>)}</div>;
}

export function CustomerReturnActions({ item }: { item: ReturnDetails }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  if (item.status !== "REQUESTED") return null;
  async function handleCancel() { setSaving(true); const result = await cancelReturn({ id: item.id }); if (!result.success) setMessage(result.error.message); else window.location.reload(); setSaving(false); }
  return <div className="space-y-2"><Button variant="outline" onClick={handleCancel} disabled={saving} isLoading={saving}>Cancel return request</Button>{message && <p role="alert" className="text-xs text-[var(--destructive)]">{message}</p>}</div>;
}
