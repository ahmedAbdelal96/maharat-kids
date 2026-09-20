import { AdminSettingsForm } from "@/modules/store/components/admin-settings-form";
import { getAdminStoreSettings } from "@/modules/store/server/queries";
import { getAdminPaymentMethods } from "@/modules/payments/server/queries";
import { AdminPaymentMethods } from "@/modules/payments/components/admin-payment-methods";
import { AdminPaymentSettings } from "@/modules/payments/components/admin-payment-settings";
import { getAdminPaymentConfiguration } from "@/modules/payments/server/config-queries";

export default async function AdminSettingsPage() {
  const [result, paymentMethods, paymentConfiguration] = await Promise.all([getAdminStoreSettings(), getAdminPaymentMethods(), getAdminPaymentConfiguration()]);

  if (!result.success) {
    throw result.error;
  }
  if (!paymentMethods.success) throw paymentMethods.error;
  if (!paymentConfiguration.success) throw paymentConfiguration.error;

  return <div className="space-y-6"><AdminSettingsForm initialValues={result.data} /><AdminPaymentSettings methods={paymentConfiguration.data.methods} accounts={paymentConfiguration.data.accounts} /><AdminPaymentMethods initialMethods={paymentMethods.data} /></div>;
}
