import { redirect } from "next/navigation";

import { AdminCustomerSegmentsClient } from "@/modules/customers/components/admin-customer-segments-client";
import { getAdminCustomerSegmentsPageData } from "@/modules/customers/server/queries";
import { parseCustomerSegmentQuery } from "@/modules/customers/segments/query";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomerSegmentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const query = parseCustomerSegmentQuery(params);
  const [result, settings] = await Promise.all([
    getAdminCustomerSegmentsPageData(query),
    getPublicStoreSettings(),
  ]);

  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/customers/segments");
    redirect("/forbidden");
  }

  if (!settings.success) throw settings.error;
  return <AdminCustomerSegmentsClient data={result.data} query={query} currency={settings.data.currency} />;
}
