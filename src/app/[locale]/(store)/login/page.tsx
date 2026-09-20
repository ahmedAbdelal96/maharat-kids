import { CustomerOtpForm } from "@/modules/auth/components/customer-otp-form";
import { resolveMarket } from "@/modules/market/server/resolver";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; returnTo?: string; error?: string; reset?: string; mode?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  if (params.mode === "admin") {
    const { CustomerLoginForm } = await import("@/modules/auth/components/customer-login-form");
    return <CustomerLoginForm googleAvailable={false} adminMode callbackUrl={params.callbackUrl ?? params.returnTo} />;
  }
  const market = await resolveMarket();
  return <CustomerOtpForm market={market.market} callbackUrl={params.callbackUrl ?? params.returnTo} />;
}
