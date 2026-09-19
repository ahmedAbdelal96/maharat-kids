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
import { createShippingCompany, updateShippingCompany } from "../server/actions";
import type { ShippingCompanyMetrics, ShippingOverview } from "../types";

const emptyForm = { name: "", phone: "", contactPerson: "", notes: "" };

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
  function openEdit(company: ShippingCompanyMetrics) { setEditing(company); setForm({ name: company.name, phone: company.phone ?? "", contactPerson: company.contactPerson ?? "", notes: company.notes ?? "" }); setError(""); setMessage(""); setIsOpen(true); }
  function replaceCompany(company: ShippingCompanyMetrics) { setData((current) => ({ ...current, companies: current.companies.map((item) => item.id === company.id ? company : item) })); }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    const result = editing ? await updateShippingCompany({ id: editing.id, ...form, isActive: editing.isActive }) : await createShippingCompany(form);
    if (!result.success) setError(result.error.message);
    else { setIsOpen(false); setMessage(editing ? "Shipping company updated." : "Shipping company created."); if (editing) replaceCompany({ ...editing, ...result.data }); else setData((current) => ({ ...current, companies: [...current.companies, { ...result.data, withCarrier: 0, outForDelivery: 0, delivered: 0, failed: 0, returnsPending: 0, codDue: "0.00" }] })); }
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
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Edit shipping company" : "Add shipping company"} description="Keep carrier contact details ready for daily operations.">
      <div className="space-y-4"><Field label="Company name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><Field label="Contact person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} /><label className="block text-xs font-semibold">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="mt-1 block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--primary)]" /></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button><Button isLoading={busy} onClick={save}>{editing ? "Save changes" : "Create company"}</Button></div></div>
    </Modal>
  </div>;
}

function Metric({ label, value, money = false, currency = "EGP" }: { label: string; value: string | number; money?: boolean; currency?: string }) { return <Card className="p-5"><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{money ? formatMoney(String(value), currency) : value}</p></Card>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold">{label}<Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 text-sm font-normal" /></label>; }
