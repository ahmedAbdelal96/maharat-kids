import { notFound, redirect } from "next/navigation";
import { OrderDetailsView } from "@/modules/orders/components/order-details-view";
import { getCustomerOrder } from "@/modules/orders/server/queries";
import { loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { getReturnEligibleOrder } from "@/modules/returns/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCustomerReviews } from "@/modules/reviews/server/queries";

export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const result = await getCustomerOrder(decodeURIComponent(orderNumber));
  if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect(loginPathForReturnTo("/account")); if (result.error.code === "ORDER_NOT_FOUND") notFound(); throw result.error; }
  const [eligibility, settings, reviews] = await Promise.all([getReturnEligibleOrder(decodeURIComponent(orderNumber)), getPublicStoreSettings(), getCustomerReviews()]);
  return <OrderDetailsView order={result.data} returnEligibility={eligibility.success ? eligibility.data : null} reviewData={reviews.success ? reviews.data : null} currency={settings.success ? settings.data.currency : result.data.currency} />;
}
