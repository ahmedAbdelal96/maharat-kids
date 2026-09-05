import { AdminSettingsForm } from "@/modules/store/components/admin-settings-form";
import { getAdminStoreSettings } from "@/modules/store/server/queries";
import { getAdminPaymentMethods } from "@/modules/payments/server/queries";
import { AdminPaymentMethods } from "@/modules/payments/components/admin-payment-methods";

export default async function AdminSettingsPage() {
  const [result, paymentMethods] = await Promise.all([getAdminStoreSettings(), getAdminPaymentMethods()]);

  if (!result.success) {
    throw result.error;
  }
  if (!paymentMethods.success) throw paymentMethods.error;

  return <div className="space-y-6"><AdminSettingsForm initialValues={result.data} /><AdminPaymentMethods initialMethods={paymentMethods.data} /></div>;
}
