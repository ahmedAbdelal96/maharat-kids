"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeReturnTo } from "../domain/policies";
import { registerCustomer } from "../server/actions";

export function CustomerRegisterForm({
  googleAvailable,
  callbackUrl,
}: {
  googleAvailable: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await registerCustomer({ email, password, confirmPassword, marketingConsent });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.replace(isSafeReturnTo(callbackUrl) ? callbackUrl : "/account");
      router.refresh();
    } catch {
      setErrorMessage("Registration service unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  const googleHref = `/auth/google/start?callbackUrl=${encodeURIComponent(isSafeReturnTo(callbackUrl) ? callbackUrl : "/account")}`;
  const checkoutContinuation = callbackUrl === "/checkout";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CardHeader className="space-y-2 p-0 pb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--primary)]">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>{checkoutContinuation ? "Create an account to continue checkout. Your cart is saved." : "Join the store with a secure customer account."}</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {errorMessage && <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] p-3 text-xs font-medium text-[var(--destructive)]" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Email Address</label>
              <Input id="register-email" type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} className="text-xs" />
            </div>
            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Password</label>
              <Input id="register-password" type="password" required placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Confirm Password</label>
              <Input id="register-confirm-password" type="password" required placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
              <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
              <span>Receive offers and updates</span>
            </label>
            <Button type="submit" size="lg" isLoading={isLoading} className="mt-2 w-full gap-2 text-xs shadow-sm">
              <span>Create Account</span><ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {googleAvailable && <>
            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]"><span className="h-px flex-1 bg-[var(--border)]" /> or <span className="h-px flex-1 bg-[var(--border)]" /></div>
            <Link href={googleHref} className="flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]">Continue with Google</Link>
          </>}

          <p className="mt-6 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--text-secondary)]">Already have an account? <Link href={`/login${isSafeReturnTo(callbackUrl) ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-[var(--primary)] hover:underline">Sign in</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
