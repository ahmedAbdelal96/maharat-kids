"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset, verifyPasswordResetCode } from "../server/actions";
import { useTranslations } from "next-intl";

export function ResetCodeForm({ email }: { email: string }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const validation = useTranslations("validation");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const result = await verifyPasswordResetCode({ email, code });
      if (!result.success) {
        setErrorMessage(validation("invalid"));
        return;
      }

      router.replace("/reset-password");
    } catch {
      setErrorMessage(t("verificationUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setErrorMessage(null);
    const result = await requestPasswordReset({ email });
    if (result.success) setMessage(result.data);
    else setErrorMessage(validation("invalid"));
    setIsResending(false);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">{t("verifyTitle")}</CardTitle>
          <CardDescription>{t("verifyDescription", { email })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {errorMessage && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
          {message && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--success)]/20 bg-[var(--success)]/10 p-3 text-xs font-medium text-[var(--success)]" role="status"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>{message}</span></div>}
          <form onSubmit={handleVerify} className="space-y-4">
            <Input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="text-center text-xl tracking-[0.45em]" />
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full text-xs">{t("verifyCode")}</Button>
          </form>
          <button type="button" onClick={handleResend} disabled={isResending} className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline disabled:opacity-60"><RotateCcw className="h-3.5 w-3.5" />{t("resendCode")}</button>
        </CardContent>
      </Card>
    </div>
  );
}
