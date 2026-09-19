"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return <div className="mx-auto max-w-xl py-20 text-center"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--destructive)]">{t("somethingWentWrong")}</p><h1 className="mt-3 text-3xl font-black tracking-tight">{t("pageCouldNotLoad")}</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">{t("notFoundDescription")}</p><div className="mt-7 flex justify-center gap-3"><Button onClick={() => reset()}>{t("tryAgain")}</Button><Link href="/"><Button variant="outline">{t("backHome")}</Button></Link></div></div>;
}
