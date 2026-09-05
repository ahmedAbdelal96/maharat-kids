import { CartClient } from "@/modules/cart/components/cart-client";
import { getCurrentCart } from "@/modules/cart/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCurrentCart();
  if (!cart.success) throw cart.error;
  const settings = await getPublicStoreSettings();
  if (!settings.success) throw settings.error;
  return <div className="space-y-8"><div className="border-b border-[var(--border)] pb-6"><h1 className="text-3xl font-extrabold tracking-tight">Shopping Cart ({cart.data.itemCount})</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Your saved items, ready whenever you are.</p></div><CartClient initialCart={cart.data} currency={settings.data.currency} /></div>;
}
