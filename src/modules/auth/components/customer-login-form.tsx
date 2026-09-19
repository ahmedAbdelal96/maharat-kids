"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeReturnTo } from "../domain/policies";
import { login } from "../server/actions";
import { stripLocalePrefix } from "@/i18n/paths";
import { useLocale, useTranslations } from "next-intl";

export function CustomerLoginForm({
  googleAvailable,
  callbackUrl,
  initialError,
  resetComplete,
}: {
  googleAvailable: boolean;
  callbackUrl?: string;
  initialError?: string;
  resetComplete?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
  const validation = useTranslations("validation");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const initialGoogleError = initialError === "google_unavailable" ? t("googleUnavailable") : initialError === "google_admin_account" ? t("googleAdminAccount") : initialError === "google_failed" ? t("googleFailed") : null;
  const [errorMessage, setErrorMessage] = useState<string | null>(initialGoogleError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await login({ email, password });

      if (!result.success) {
        setErrorMessage(validation("invalid"));
        return;
      }

      const fallback = result.data.user.type === "ADMIN" ? "/admin" : "/account";
      router.replace(isSafeReturnTo(callbackUrl) ? stripLocalePrefix(callbackUrl) : fallback);
      router.refresh();
    } catch {
      setErrorMessage(t("serviceUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }

  const safeCallback = isSafeReturnTo(callbackUrl) ? stripLocalePrefix(callbackUrl) : "/account";
  const googleHref = `/auth/google/start?callbackUrl=${encodeURIComponent(`/${locale}${safeCallback}`)}`;
  const checkoutContinuation = stripLocalePrefix(callbackUrl ?? "") === "/checkout";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--primary)]">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("welcome")}</CardTitle>
          <CardDescription>{checkoutContinuation ? t("continueCheckout") : t("signInDescription")}</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {resetComplete && !errorMessage && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--success)]/20 bg-[var(--success)]/10 p-3 text-xs font-medium text-[var(--success)]" role="status">
            {t("passwordUpdated")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">{t("email")}</label>
              <Input id="login-email" type="email" required placeholder={t("email")} value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} className="text-xs" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold text-[var(--text-primary)]">{t("password")}</label>
                <Link href="/forgot-password" className="text-xs text-[var(--primary)] hover:underline">{t("forgotPassword")}</Link>
              </div>
              <Input id="login-password" type="password" required placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading} className="mt-2 w-full gap-2 text-xs shadow-sm">
              <span>{t("signIn")}</span><ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {googleAvailable && (
            <>
              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" /> {t("or")} <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <Link href={googleHref} className="flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]">
                {t("continueGoogle")}
              </Link>
            </>
          )}

          <p className="mt-6 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--text-secondary)]">
            {t("noAccount")} <Link href={`/register${isSafeReturnTo(callbackUrl) ? `?callbackUrl=${encodeURIComponent(safeCallback)}` : ""}`} className="font-semibold text-[var(--primary)] hover:underline">{t("createAccount")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
