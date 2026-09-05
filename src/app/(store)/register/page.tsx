import { env } from "@/config/env";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

import { CustomerRegisterForm } from "@/modules/auth/components/customer-register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; returnTo?: string }>;
}) {
  const settings = await getPublicStoreSettings();
  const googleAvailable =
    settings.success &&
    settings.data.googleEnabled &&
    Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const params = searchParams ? await searchParams : {};

  return <CustomerRegisterForm googleAvailable={googleAvailable} callbackUrl={params.callbackUrl ?? params.returnTo} />;
}
