import { ResetCodeForm } from "@/modules/auth/components/reset-code-form";

export default async function VerifyResetCodePage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  return <ResetCodeForm email={params.email ?? ""} />;
}
