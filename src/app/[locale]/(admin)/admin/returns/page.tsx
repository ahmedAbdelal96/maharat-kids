import { redirect } from "next/navigation";
import { AdminReturnsClient } from "@/modules/returns/components/admin-returns-client";
import { getAdminReturnsPage } from "@/modules/returns/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string; refundPending?: string }> }) {
  const query = await searchParams;
  const result = await getAdminReturnsPage({ search: query.search, status: query.status, page: query.page, refundPending: query.refundPending });
  const settings = await getPublicStoreSettings();
  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/returns");
    if (result.error.code === "FORBIDDEN") redirect("/forbidden");
    throw result.error;
  }
  if (!settings.success) throw settings.error;
  return <AdminReturnsClient initialData={result.data} currency={settings.data.currency} initialSearch={query.search ?? ""} initialStatus={query.status ?? "ALL"} />;
}
