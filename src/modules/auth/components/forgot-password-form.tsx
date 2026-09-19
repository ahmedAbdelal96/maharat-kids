"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "../server/actions";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const validation = useTranslations("validation");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await requestPasswordReset({ email });
      if (!result.success) {
        setErrorMessage(validation("invalid"));
        return;
      }

      router.replace(`/reset-password/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setErrorMessage(t("serviceUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">{t("forgotTitle")}</CardTitle>
          <CardDescription>{t("forgotDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {errorMessage && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">{t("email")}</label>
              <Input id="forgot-email" type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} className="text-xs" />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full gap-2 text-xs"><span>{t("sendCode")}</span><ArrowRight className="h-4 w-4" /></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
