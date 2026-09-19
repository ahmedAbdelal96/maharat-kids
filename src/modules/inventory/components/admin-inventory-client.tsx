"use client";

import { useState } from "react";
import { Search, Save } from "lucide-react";
import { updateInventoryQuantity } from "../server/actions";
import { getInventoryState } from "../domain/inventory";
import type { InventoryFilter, InventoryPage } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

type Filters = { search: string; filter: InventoryFilter; status: "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED" };

const filterLabels: Array<{ value: InventoryFilter; label: string }> = [
  { value: "ALL", label: "All inventory" }, { value: "TRACKED", label: "Tracked" }, { value: "UNTRACKED", label: "Untracked" },
  { value: "IN_STOCK", label: "In stock" }, { value: "LOW_STOCK", label: "Low stock" }, { value: "OUT_OF_STOCK", label: "Out of stock" },
];

function navigate(router: ReturnType<typeof useRouter>, filters: Filters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.filter !== "ALL") params.set("filter", filters.filter);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  router.push(params.size ? `/admin/inventory?${params.toString()}` : "/admin/inventory");
}

export function AdminInventoryClient({ page, initialFilters }: { page: InventoryPage; initialFilters: Filters }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState(initialFilters.search);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function submitSearch(event: React.FormEvent) { event.preventDefault(); const next = { ...filters, search }; setFilters(next); navigate(router, next); }
  async function save(productId: string, current: number) {
    const quantity = Number(drafts[productId] ?? current);
    if (!Number.isInteger(quantity) || quantity < 0) { setError("Stock quantity must be a non-negative whole number."); return; }
    setSavingId(productId); setError(""); const result = await updateInventoryQuantity({ productId, stockQuantity: quantity }); setSavingId(null);
    if (!result.success) { setError(result.error.message); return; }
    setDrafts((draft) => { const next = { ...draft }; delete next[productId]; return next; }); router.refresh();
  }
  const countCards = [["All", page.counts.all], ["Tracked", page.counts.tracked], ["Untracked", page.counts.untracked], ["In stock", page.counts.inStock], ["Low stock", page.counts.lowStock], ["Out of stock", page.counts.outOfStock]] as const;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Inventory</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Monitor availability and update tracked stock safely.</p></div><p className="text-xs text-[var(--text-muted)]">Low stock threshold: 5 units</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{countCards.map(([label, count]) => <Card key={label} className="p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-2xl font-black">{count}</p></Card>)}</div>
    <form onSubmit={submitSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product name or SKU..." className="pl-9" /></div><select value={filters.filter} onChange={(event) => { const next = { ...filters, filter: event.target.value as InventoryFilter }; setFilters(next); navigate(router, next); }} aria-label="Filter inventory state" className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs">{filterLabels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={filters.status} onChange={(event) => { const next = { ...filters, status: event.target.value as Filters["status"] }; setFilters(next); navigate(router, next); }} aria-label="Filter product status" className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select><Button type="submit" variant="outline">Search</Button></form>
    {error && <p role="alert" className="rounded-md bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-[var(--border)] text-xs text-[var(--text-secondary)]"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Tracking</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">State</th><th className="px-5 py-3 text-right">Quick update</th></tr></thead><tbody>{page.items.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">No products match these inventory filters.</td></tr> : page.items.map((product) => { const state = getInventoryState(product); const isUntracked = state === "UNTRACKED"; const value = drafts[product.id] ?? String(product.stockQuantity); return <tr key={product.id} className="border-b border-[var(--border-subtle)] last:border-0"><td className="px-5 py-4"><p className="text-sm font-semibold">{product.name}</p><p className="text-[11px] text-[var(--text-muted)]">{product.status}</p></td><td className="px-5 py-4 font-mono text-xs text-[var(--text-secondary)]">{product.sku ?? "—"}</td><td className="px-5 py-4 text-xs text-[var(--text-secondary)]">{product.categoryName ?? "Uncategorized"}</td><td className="px-5 py-4 text-xs">{isUntracked ? "Not tracked" : "Tracked"}</td><td className="px-5 py-4 text-sm font-bold">{isUntracked ? "Unlimited" : product.stockQuantity}</td><td className="px-5 py-4"><Badge size="sm" variant={state === "OUT_OF_STOCK" ? "destructive" : state === "LOW_STOCK" ? "warning" : state === "UNTRACKED" ? "secondary" : "success"}>{state.replaceAll("_", " ")}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Input aria-label={`Stock quantity for ${product.name}`} type="number" min={0} step={1} value={value} onChange={(event) => setDrafts((current) => ({ ...current, [product.id]: event.target.value }))} disabled={isUntracked || savingId === product.id} className="h-9 w-24 text-xs" /><Button size="icon" aria-label={`Save stock for ${product.name}`} onClick={() => void save(product.id, product.stockQuantity)} disabled={isUntracked || savingId === product.id}><Save className="h-4 w-4" /></Button></div></td></tr>; })}</tbody></table></div></CardContent></Card>
    {page.totalPages > 1 && <div className="flex items-center justify-center gap-3 text-xs"><Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => navigate(router, filters, page.page - 1)}>Previous</Button><span className="text-[var(--text-secondary)]">Page {page.page} of {page.totalPages}</span><Button variant="outline" size="sm" disabled={page.page >= page.totalPages} onClick={() => navigate(router, filters, page.page + 1)}>Next</Button></div>}
  </div>;
}
