import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { AdminCustomer360Client } from "@/modules/customers/components/admin-customer-360-client";
import { getAdminCustomerIntelligencePageData } from "@/modules/customers/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomer360Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ ordersPage?: string }> }) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const orderPage = Math.max(1, Number(query.ordersPage) || 1);
  const [result, settings] = await Promise.all([getAdminCustomerIntelligencePageData(id, orderPage), getPublicStoreSettings()]);
  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect(`/login?returnTo=/admin/customers/${id}`);
    if (result.error.code === "FORBIDDEN") redirect("/forbidden");
    if (result.error.code === "NOT_FOUND") notFound();
    throw result.error;
  }
  if (!settings.success) throw settings.error;
  return <AdminCustomer360Client initialData={result.data} currency={settings.data.currency} />;
}
