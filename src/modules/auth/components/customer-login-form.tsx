"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeReturnTo } from "../domain/policies";
import { login } from "../server/actions";

function googleErrorMessage(error?: string): string | null {
  if (error === "google_unavailable") return "Google sign-in is not available right now.";
  if (error === "google_admin_account") return "Please use the administration sign-in for this account.";
  if (error === "google_failed") return "Google sign-in could not be completed.";
  return null;
}

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(googleErrorMessage(initialError));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await login({ email, password });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      const fallback = result.data.user.type === "ADMIN" ? "/admin" : "/account";
      router.replace(isSafeReturnTo(callbackUrl) ? callbackUrl : fallback);
      router.refresh();
    } catch {
      setErrorMessage("Authentication service unavailable.");
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
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>{checkoutContinuation ? "Sign in to continue checkout. Your cart is saved." : "Sign in to your customer account or administration dashboard."}</CardDescription>
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
              Password updated successfully. You can now sign in with your new password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Email Address</label>
              <Input id="login-email" type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} className="text-xs" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold text-[var(--text-primary)]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[var(--primary)] hover:underline">Forgot?</Link>
              </div>
              <Input id="login-password" type="password" required placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock className="h-4 w-4" />} className="text-xs" />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading} className="mt-2 w-full gap-2 text-xs shadow-sm">
              <span>Sign In</span><ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {googleAvailable && (
            <>
              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" /> or <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <Link href={googleHref} className="flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]">
                Continue with Google
              </Link>
            </>
          )}

          <p className="mt-6 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--text-secondary)]">
            Don&apos;t have an account? <Link href={`/register${isSafeReturnTo(callbackUrl) ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-[var(--primary)] hover:underline">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
