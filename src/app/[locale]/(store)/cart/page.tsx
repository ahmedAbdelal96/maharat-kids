import { CartClient } from "@/modules/cart/components/cart-client";
import { getCurrentCart } from "@/modules/cart/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("cart");
  return { title: t("drawerTitle", { count: 0 }) };
}

export default async function CartPage() {
  const cart = await getCurrentCart();
  if (!cart.success) throw cart.error;
  const settings = await getPublicStoreSettings();
  if (!settings.success) throw settings.error;
  const t = await getTranslations("cart");
  return <div className="space-y-8"><div className="border-b border-[var(--border)] pb-6"><h1 className="text-3xl font-extrabold tracking-tight">{t("drawerTitle", { count: cart.data.itemCount })}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">{t("drawerDescription")}</p></div><CartClient initialCart={cart.data} currency={settings.data.currency} /></div>;
}
