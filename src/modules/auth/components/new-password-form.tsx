"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPassword } from "../server/actions";
import { useTranslations } from "next-intl";

export function NewPasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const validation = useTranslations("validation");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await resetPassword({ password, confirmPassword });
      if (!result.success) {
        setErrorMessage(validation("invalid"));
        return;
      }
      router.replace("/login?reset=success");
    } catch {
      setErrorMessage(t("passwordUpdateUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center"><CardTitle className="text-2xl font-bold">{t("newPasswordTitle")}</CardTitle><CardDescription>{t("newPasswordDescription")}</CardDescription></CardHeader>
        <CardContent className="p-0">
          {errorMessage && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="new-password" type="password" required minLength={12} placeholder={t("newPassword")} value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            <Input id="confirm-new-password" type="password" required minLength={12} placeholder={t("confirmPassword")} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full text-xs">{t("saveNewPassword")}</Button>
          </form>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--text-secondary)]"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> {t("sessionsSignedOut")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
