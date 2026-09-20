import { redirect } from "next/navigation";
import { OrderSuccess } from "@/modules/orders/components/order-success";
import { getCustomerOrder } from "@/modules/orders/server/queries";
import { requireCustomer } from "@/modules/auth/server/queries";
import { reconcileOnlinePayment } from "@/modules/payments/server/gateway-service";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams?: Promise<{ order?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (!params.order) redirect("/account");
  const actor = await requireCustomer();
  if (actor.success) await reconcileOnlinePayment(params.order, actor.data.user.id).catch(() => undefined);
  const result = await getCustomerOrder(params.order);
  if (!result.success) throw result.error;
  return <OrderSuccess order={result.data} />;
}
