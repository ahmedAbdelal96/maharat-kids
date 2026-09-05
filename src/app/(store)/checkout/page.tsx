import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutClient } from "@/modules/orders/components/checkout-client";
import { getCheckoutData } from "@/modules/orders/server/queries";
import { loginPathForReturnTo } from "@/modules/auth/domain/policies";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const result = await getCheckoutData();
  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect(loginPathForReturnTo("/checkout"));
    if (result.error.code === "FORBIDDEN") redirect("/account");
    return <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-[var(--warning)]/30 bg-[var(--surface-card)] p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-subtle)] text-[var(--warning)]"><AlertTriangle className="h-6 w-6" /></div><h1 className="mt-4 text-xl font-extrabold">Checkout needs your attention</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{result.error.message}</p><Link href="/cart"><Button className="mt-5">Return to Cart</Button></Link></div>;
  }
  if (result.data.cart.items.length === 0) redirect("/cart");
  return <div className="space-y-7"><div><h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">A short, secure checkout for your saved customer account.</p></div><CheckoutClient data={result.data} /></div>;
}
