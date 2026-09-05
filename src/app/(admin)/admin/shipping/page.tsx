import { redirect } from "next/navigation";
import { AdminShippingClient } from "@/modules/shipping/components/admin-shipping-client";
import { getShippingOverview } from "@/modules/shipping/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [result, settings] = await Promise.all([getShippingOverview(), getPublicStoreSettings()]);
  if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/shipping"); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); throw result.error; }
  if (!settings.success) throw settings.error;
  return <AdminShippingClient initialData={result.data} currency={settings.data.currency} />;
}
