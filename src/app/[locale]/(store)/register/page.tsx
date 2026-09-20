import { CustomerOtpForm } from "@/modules/auth/components/customer-otp-form";
import { resolveMarket } from "@/modules/market/server/resolver";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; returnTo?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const market = await resolveMarket();
  return <CustomerOtpForm market={market.market} callbackUrl={params.callbackUrl ?? params.returnTo} />;
}
