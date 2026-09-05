import { env } from "@/config/env";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

import { CustomerLoginForm } from "@/modules/auth/components/customer-login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; returnTo?: string; error?: string; reset?: string }>;
}) {
  const settings = await getPublicStoreSettings();
  const googleAvailable =
    settings.success &&
    settings.data.googleEnabled &&
    Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const params = searchParams ? await searchParams : {};

  return (
    <CustomerLoginForm
      googleAvailable={googleAvailable}
      callbackUrl={params.callbackUrl ?? params.returnTo}
      initialError={params.error}
      resetComplete={params.reset === "success"}
    />
  );
}
