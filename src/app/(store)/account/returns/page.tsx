import { redirect } from "next/navigation";
import { loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { requireCustomer } from "@/modules/auth/server/queries";
import { getCustomerReturns } from "@/modules/returns/server/queries";
import { CustomerReturnsList } from "@/modules/returns/components/customer-returns-client";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

export const dynamic = "force-dynamic";

export default async function CustomerReturnsPage() {
  const current = await requireCustomer();
  if (!current.success) { if (current.error.code === "UNAUTHORIZED") redirect(loginPathForReturnTo("/account/returns")); if (current.error.code === "FORBIDDEN") redirect("/admin"); throw current.error; }
  const [returns, settings] = await Promise.all([getCustomerReturns(), getPublicStoreSettings()]);
  if (!returns.success) throw returns.error;
  if (!settings.success) throw settings.error;
  return <div className="mx-auto max-w-5xl space-y-6"><div><p className="text-xs font-semibold text-[var(--primary)]">Account</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Returns &amp; refunds</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Track customer returns and refund progress in one place.</p></div><CustomerReturnsList returns={returns.data.returns} currency={settings.data.currency} /></div>;
}
