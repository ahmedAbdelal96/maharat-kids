import { redirect } from "next/navigation";
import { AdminPaymentOperations } from "@/modules/payments/components/admin-payment-operations";
import { getPaymentVerificationQueue, getPendingPaymentSettlements } from "@/modules/payments/server/operations-queries";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [verification, settlements] = await Promise.all([getPaymentVerificationQueue(), getPendingPaymentSettlements()]);
  for (const result of [verification, settlements]) if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect("/login?returnTo=/admin/payments"); throw result.error; }
  return <AdminPaymentOperations initialVerification={verification.success ? verification.data : []} initialSettlements={settlements.success ? settlements.data : []} />;
}
