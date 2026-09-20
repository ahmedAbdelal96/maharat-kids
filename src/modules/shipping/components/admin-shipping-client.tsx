"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Pencil, Plus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/formatters";
import { createShippingCompany, updateShippingCarrierConfiguration, updateShippingCompany } from "../server/actions";
import type { ShippingCompanyMetrics, ShippingOverview } from "../types";

const emptyForm = { code: "", name: "", nameAr: "", nameEn: "", phone: "", contactPerson: "", notes: "" };

function statusVariant(active: boolean): "success" | "secondary" { return active ? "success" : "secondary"; }

export function AdminShippingClient({ initialData, currency }: { initialData: ShippingOverview; currency: string }) {
  const [data, setData] = useState(initialData);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<ShippingCompanyMetrics | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setMessage(""); setIsOpen(true); }
  function openEdit(company: ShippingCompanyMetrics) { setEditing(company); setForm({ code: company.code, name: company.name, nameAr: company.nameAr ?? "", nameEn: company.nameEn ?? "", phone: company.phone ?? "", contactPerson: company.contactPerson ?? "", notes: company.notes ?? "" }); setError(""); setMessage(""); setIsOpen(true); }
  function replaceCompany(company: ShippingCompanyMetrics) { setData((current) => ({ ...current, companies: current.companies.map((item) => item.id === company.id ? company : item) })); }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    const result = editing ? await updateShippingCompany({ id: editing.id, ...form, isActive: editing.isActive }) : await createShippingCompany(form);
    if (!result.success) setError(result.error.message);
    else { setIsOpen(false); setMessage(editing ? "Shipping company updated." : "Shipping company created."); if (editing) replaceCompany({ ...editing, ...result.data }); else setData((current) => ({ ...current, companies: [...current.companies, { ...result.data, withCarrier: 0, outForDelivery: 0, delivered: 0, failed: 0, returnsPending: 0, codDue: "0.00" }], configurations: [...current.configurations, { ...result.data, markets: [] }] })); }
    setBusy(false);
  }

  async function toggle(company: ShippingCompanyMetrics) {
    setBusy(true); setError("");
    const result = await updateShippingCompany({ id: company.id, name: company.name, phone: company.phone ?? "", contactPerson: company.contactPerson ?? "", notes: company.notes ?? "", isActive: !company.isActive });
    if (!result.success) setError(result.error.message); else { replaceCompany({ ...company, ...result.data }); setMessage(`${company.name} is now ${result.data.isActive ? "active" : "inactive"}.`); }
    setBusy(false);
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Operations</p><h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Shipping</h1><p className="mt-1 text-xs text-[var(--text-secondary)]">Hand over parcels, track returns, and reconcile carrier COD.</p></div><Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add company</Button></div>
    {(error || message) && <p role="alert" className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${error ? "bg-[var(--destructive-subtle)] text-[var(--destructive)]" : "bg-[var(--success-subtle)] text-[var(--success)]"}`}>{error || message}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Shipping companies" value={data.totals.companies} /><Metric label="With carriers" value={data.totals.withCarrier} /><Metric label="COD due from carriers" value={data.totals.codDue} money currency={currency} /><Metric label="Returns with carriers" value={data.totals.returnsPending} /></div>
     <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4 text-[var(--primary)]" />Carrier operations</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-left text-[11px] uppercase tracking-wide text-[var(--text-secondary)]"><tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">With carrier</th><th className="px-4 py-3">Out for delivery</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">COD due</th><th className="px-4 py-3">Returns</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[var(--border)]">{data.companies.map((company) => <tr key={company.id} className="hover:bg-[var(--surface-muted)]/40"><td className="px-4 py-4"><div className="flex items-center gap-2"><Link href={`/admin/shipping/${company.id}`} className="font-semibold text-[var(--primary)] hover:underline">{company.name}</Link><Badge size="sm" variant={statusVariant(company.isActive)}>{company.isActive ? "Active" : "Inactive"}</Badge></div><p className="mt-1 text-xs text-[var(--text-muted)]">{company.contactPerson || company.phone || "No contact details"}</p></td><td className="px-4 py-4 font-semibold">{company.withCarrier}</td><td className="px-4 py-4">{company.outForDelivery}</td><td className="px-4 py-4">{company.delivered}</td><td className="px-4 py-4 font-semibold">{formatMoney(company.codDue, currency)}</td><td className="px-4 py-4">{company.returnsPending}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => openEdit(company)} aria-label={`Edit ${company.name}`}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="outline" size="sm" disabled={busy} onClick={() => toggle(company)}>{company.isActive ? "Deactivate" : "Activate"}</Button></div></td></tr>)}</tbody></table></div>{data.companies.length === 0 && <p className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">Add a shipping company to start tracking carrier operations.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Checkout carrier and market rates</CardTitle><p className="text-xs text-[var(--text-secondary)]">One enabled checkout carrier is resolved automatically per market. Customers never choose between carriers.</p></CardHeader><CardContent className="space-y-4">{data.configurations.map((config) => <CarrierConfigCard key={config.id} config={config} busy={busy} onSave={async (next) => { setBusy(true); setError(""); const result = await updateShippingCarrierConfiguration(next); if (result.success) { setData((current) => ({ ...current, configurations: current.configurations.map((item) => item.id === result.data.id ? result.data : item), companies: current.companies.map((item) => item.id === result.data.id ? { ...item, ...result.data } : item) })); setMessage(`${result.data.name} checkout settings saved.`); } else setError(result.error.message); setBusy(false); }} />)}</CardContent></Card>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Edit shipping company" : "Add shipping company"} description="Keep carrier identity and contact details ready for daily operations.">
      <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Carrier code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} /><Field label="Company name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label="Arabic name" value={form.nameAr} onChange={(value) => setForm({ ...form, nameAr: value })} /><Field label="English name" value={form.nameEn} onChange={(value) => setForm({ ...form, nameEn: value })} /></div><Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><Field label="Contact person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} /><label className="block text-xs font-semibold">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="mt-1 block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--primary)]" /></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button><Button isLoading={busy} onClick={save}>{editing ? "Save changes" : "Create company"}</Button></div></div>
    </Modal>
  </div>;
}

function Metric({ label, value, money = false, currency = "EGP" }: { label: string; value: string | number; money?: boolean; currency?: string }) { return <Card className="p-5"><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{money ? formatMoney(String(value), currency) : value}</p></Card>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold">{label}<Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 text-sm font-normal" /></label>; }

function CarrierConfigCard({ config, busy, onSave }: { config: ShippingOverview["configurations"][number]; busy: boolean; onSave: (input: Parameters<typeof updateShippingCarrierConfiguration>[0]) => Promise<void> }) {
  const [draft, setDraft] = useState(config);
  function updateMarket(market: "SAUDI_ARABIA" | "EGYPT", patch: Partial<typeof draft.markets[number]>) { setDraft((current) => ({ ...current, markets: current.markets.map((entry) => entry.market === market ? { ...entry, ...patch } : entry) })); }
  const market = (name: "SAUDI_ARABIA" | "EGYPT") => draft.markets.find((entry) => entry.market === name) ?? { market: name, enabled: false, isCheckoutCarrier: false, rate: "0.00" };
  const submit = () => onSave({ id: draft.id, code: draft.code, name: draft.name, nameAr: draft.nameAr ?? "", nameEn: draft.nameEn ?? "", isActive: draft.isActive, markets: { SAUDI_ARABIA: { enabled: market("SAUDI_ARABIA").enabled, isCheckoutCarrier: market("SAUDI_ARABIA").isCheckoutCarrier, rate: Number(market("SAUDI_ARABIA").rate) }, EGYPT: { enabled: market("EGYPT").enabled, isCheckoutCarrier: market("EGYPT").isCheckoutCarrier, rate: Number(market("EGYPT").rate) } } });
  return <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{draft.nameEn || draft.name}</p><p className="text-[11px] text-[var(--text-muted)]">{draft.code} · {draft.isActive ? "Active" : "Inactive"}</p></div><Button size="sm" isLoading={busy} onClick={submit}>Save rates</Button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{(["SAUDI_ARABIA", "EGYPT"] as const).map((name) => { const entry = market(name); const currency = name === "SAUDI_ARABIA" ? "SAR" : "EGP"; return <div key={name} className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold">{name === "SAUDI_ARABIA" ? "Saudi Arabia" : "Egypt"}</p><span className="text-[10px] text-[var(--text-muted)]">{currency}</span></div><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={entry.enabled} onChange={(event) => updateMarket(name, { enabled: event.target.checked })} />Enabled</label><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={entry.isCheckoutCarrier} onChange={(event) => updateMarket(name, { isCheckoutCarrier: event.target.checked })} />Checkout carrier</label><label className="mt-3 block text-xs font-semibold">Shipping fee ({currency})<Input type="number" min="0" step="0.01" value={entry.rate} onChange={(event) => updateMarket(name, { rate: event.target.value })} className="mt-1 text-sm font-normal" /></label></div>; })}</div></div>;
}
