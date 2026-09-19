import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { AdminShippingCompanyClient } from "@/modules/shipping/components/admin-shipping-company-client";
import { getShippingCompanyDetail } from "@/modules/shipping/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import type { ShipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminShippingCompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const paramsValue = searchParams ? await searchParams : {};
  const value = (key: string) => { const entry = paramsValue[key]; return Array.isArray(entry) ? entry[0] : entry; };
  const rawStatus = value("status");
  const status = ["NOT_ASSIGNED", "READY_FOR_SHIPPING", "WITH_CARRIER", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED", "RETURNING", "RETURNED_TO_STORE"].includes(rawStatus ?? "") ? rawStatus as ShipmentStatus : undefined;
  const query = { page: Math.max(1, Number(value("page")) || 1), search: value("search")?.trim() || undefined, status };
  const [result, settings] = await Promise.all([getShippingCompanyDetail(id, query), getPublicStoreSettings()]);
  if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect(`/login?returnTo=/admin/shipping/${id}`); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); if (result.error.code === "NOT_FOUND") notFound(); throw result.error; }
  if (!settings.success) throw settings.error;
  return <AdminShippingCompanyClient initialData={result.data} currency={settings.data.currency} query={query} />;
}
