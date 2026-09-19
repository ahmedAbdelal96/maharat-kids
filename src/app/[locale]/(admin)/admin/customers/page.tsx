import { redirect } from "next/navigation";

import { AdminCustomersClient } from "@/modules/customers/components/admin-customers-client";
import { getAdminCustomersPageData } from "@/modules/customers/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import type { CustomerListQuery } from "@/modules/customers/intelligence/types";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const value = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const status = value("status");
  const purchase = value("purchase");
  const customerValue = value("value");
  const marketing = value("marketing");
  const query: CustomerListQuery = {
    page: Math.max(1, Number(value("page")) || 1),
    search: value("search")?.trim() || undefined,
    status: status === "ACTIVE" || status === "INACTIVE" || status === "SUSPENDED" || status === "PENDING" ? status : undefined,
    purchase: purchase === "HAS_ORDERS" || purchase === "NO_ORDERS" ? purchase : undefined,
    value: customerValue === "HAS_SPENT" || customerValue === "NEVER_PURCHASED" ? customerValue : undefined,
    marketing: marketing === "OPTED_IN" || marketing === "NOT_OPTED_IN" ? marketing : undefined,
  };
  const [result, settings] = await Promise.all([getAdminCustomersPageData(query), getPublicStoreSettings()]);

  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/customers");
    redirect("/forbidden");
  }

  if (!settings.success) throw settings.error;
  return <AdminCustomersClient initialCustomers={result.data} canUpdate={result.data.canUpdate} currency={settings.data.currency} query={query} />;
}
