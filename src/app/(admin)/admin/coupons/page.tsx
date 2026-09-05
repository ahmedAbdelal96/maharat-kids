import { redirect } from "next/navigation";
import { AdminCouponsClient } from "@/modules/coupons/components/admin-coupons-client";
import { getAdminCoupons } from "@/modules/coupons/server/queries";

export const metadata = { title: "Coupons | Admin", description: "Manage customer coupon codes and usage." };

export default async function AdminCouponsPage() {
  const result = await getAdminCoupons();
  if (!result.success) { if (result.error.code === "UNAUTHENTICATED") redirect("/login?callbackUrl=/admin/coupons"); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); throw result.error; }
  return <AdminCouponsClient coupons={result.data.items} />;
}
