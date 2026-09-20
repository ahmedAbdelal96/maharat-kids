"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { requestCustomerOtp, verifyCustomerOtp } from "../server/otp-actions";
import { isSafeReturnTo } from "../domain/policies";
import { stripLocalePrefix } from "@/i18n/paths";
import type { Market } from "@/modules/market/domain/market";

export function CustomerOtpForm({ market, callbackUrl }: { market: Market; callbackUrl?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const arabic = locale === "ar";
  const isSaudi = market === "SAUDI_ARABIA";
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (remaining <= 0) return; const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [remaining]);
  const copy = arabic
    ? { title: "تسجيل الدخول", detail: isSaudi ? "أدخل رقم جوالك السعودي وسنرسل رمزاً آمناً." : "أدخل بريدك الإلكتروني وسنرسل رمزاً آمناً.", field: isSaudi ? "رقم الجوال" : "البريد الإلكتروني", send: "إرسال الرمز", code: "رمز التحقق", verify: "متابعة", resend: "إعادة إرسال الرمز", invalid: "تعذر التحقق من الرمز. حاول مرة أخرى." }
    : { title: "Continue securely", detail: isSaudi ? "Enter your Saudi mobile number and we will send a secure code." : "Enter your email address and we will send a secure code.", field: isSaudi ? "Mobile number" : "Email address", send: "Send code", code: "Verification code", verify: "Continue", resend: "Resend code", invalid: "We could not verify that code. Try again." };
  async function send() { setLoading(true); setMessage(null); const result = await requestCustomerOtp({ destination }); setLoading(false); if (!result.success) { setMessage(copy.invalid); return; } setSent(true); setRemaining(result.data.retryAfterSeconds); window.setTimeout(() => codeRef.current?.focus(), 50); }
  async function verify() { setLoading(true); setMessage(null); const result = await verifyCustomerOtp({ destination, code }); setLoading(false); if (!result.success) { setMessage(copy.invalid); return; } router.replace(isSafeReturnTo(callbackUrl) ? stripLocalePrefix(callbackUrl) : "/account"); router.refresh(); }
  return <main dir={arabic ? "rtl" : "ltr"} className="flex min-h-[70dvh] items-center justify-center px-4 py-10 sm:px-6"><Card className="w-full max-w-md p-6 sm:p-8"><CardHeader className="space-y-2 p-0 pb-6 text-center"><div className="mx-auto mb-2"><BrandLockup variant="auth" priority /></div><CardTitle className="text-2xl font-bold">{copy.title}</CardTitle><CardDescription>{copy.detail}</CardDescription></CardHeader><CardContent className="space-y-4 p-0">{message && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] p-3 text-xs text-[var(--destructive)]">{message}</p>}<label className="block text-xs font-semibold">{copy.field}<Input className="mt-1.5" autoComplete={isSaudi ? "tel" : "email"} inputMode={isSaudi ? "tel" : "email"} type={isSaudi ? "tel" : "email"} value={destination} onChange={(event) => setDestination(event.target.value)} disabled={loading} /></label>{sent && <label className="block text-xs font-semibold">{copy.code}<Input ref={codeRef} className="mt-1.5 text-center text-lg tracking-[0.45em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onPaste={(event) => setCode(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6))} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}<Button type="button" size="lg" className="w-full" isLoading={loading} disabled={!destination.trim() || (sent && code.length !== 6)} onClick={() => void (sent ? verify() : send())}>{sent ? copy.verify : copy.send}</Button>{sent && <Button type="button" variant="outline" className="w-full" disabled={loading || remaining > 0} onClick={() => void send()}>{remaining > 0 ? `${copy.resend} (${remaining}s)` : copy.resend}</Button>}</CardContent></Card></main>;
}
