"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "../server/actions";

export function ForgotPasswordForm() {
  const router = useRouter();
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
        setErrorMessage(result.error.message);
        return;
      }

      router.replace(`/reset-password/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setErrorMessage("Password recovery is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a verification code.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {errorMessage && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Email Address</label>
              <Input id="forgot-email" type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} className="text-xs" />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full gap-2 text-xs"><span>Send Code</span><ArrowRight className="h-4 w-4" /></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
