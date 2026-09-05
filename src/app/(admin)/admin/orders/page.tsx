import { redirect } from "next/navigation";
import { AdminOrdersClient } from "@/modules/orders/components/admin-orders-client";
import { getAdminOrders } from "@/modules/orders/server/queries";
import { getShippingCompanies } from "@/modules/shipping/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const [result, shippingCompanies] = await Promise.all([getAdminOrders(), getShippingCompanies()]);
  if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/orders"); throw result.error; }
  return <AdminOrdersClient initialOrders={result.data} initialOrderId={(await searchParams).order} initialShippingCompanies={shippingCompanies.success ? shippingCompanies.data : []} />;
}
