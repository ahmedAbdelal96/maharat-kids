"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/config/locale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common.language");

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const query = window.location.search;
    router.replace(`${pathname}${query}`, { locale: nextLocale, scroll: false });
  }

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/60 p-1", className)} aria-label={t("label")}>
      <button type="button" onClick={() => switchLocale("ar")} aria-current={locale === "ar" ? "true" : undefined} aria-label={t("switchToArabic")} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors", locale === "ar" ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>AR</button>
      <button type="button" onClick={() => switchLocale("en")} aria-current={locale === "en" ? "true" : undefined} aria-label={t("switchToEnglish")} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors", locale === "en" ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>EN</button>
    </div>
  );
}
