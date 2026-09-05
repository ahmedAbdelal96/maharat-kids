import { redirect } from "next/navigation";
import { OrderSuccess } from "@/modules/orders/components/order-success";
import { getCustomerOrder } from "@/modules/orders/server/queries";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams?: Promise<{ order?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (!params.order) redirect("/account");
  const result = await getCustomerOrder(params.order);
  if (!result.success) throw result.error;
  return <OrderSuccess order={result.data} />;
}
