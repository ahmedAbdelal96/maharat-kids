import { Link } from "@/i18n/navigation";
import { appConfig } from "@/config/app.config";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";

export interface StoreFooterProps {
  storeName?: string;
  description?: string;
}

export async function StoreFooter({
  storeName = appConfig.name,
}: StoreFooterProps) {
  const currentYear = new Date().getFullYear();
  const locale = await getLocale();
  const t = await getTranslations("navigation");
  const actions = await getTranslations("common.actions");

  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-card)] text-[var(--foreground)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <Link href="/" className="transition-opacity hover:opacity-85 inline-block" aria-label="Maharat Kids home">
              <BrandLockup variant="footer" />
            </Link>
            <p className="text-xs font-semibold text-[var(--brand-green)]">نتعلم • نلعب • نتطور</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
              {locale === "ar" ? "أدوات للتعلّم واللعب ومنتجات مختارة بعناية لعقول تنمو كل يوم." : "Learning tools, creative play, and thoughtful products chosen for growing minds."}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t("categories")}
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li>
                <Link href="/products" className="hover:text-[var(--primary)] transition-colors">
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[var(--primary)] transition-colors">
                  {t("categories")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Area */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t("account")}
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li>
                <Link href="/account" className="hover:text-[var(--primary)] transition-colors">
                  {t("account")}
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[var(--primary)] transition-colors">
                  {t("cart")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Management */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t("admin")}
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li>
                <Link href="/admin" className="hover:text-[var(--primary)] transition-colors">
                  {t("admin")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--primary)] transition-colors">
                  {actions("signIn")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {currentYear} {storeName}.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[var(--text-secondary)]">{locale === "ar" ? "نتعلم • نلعب • نتطور" : "Learn • play • grow"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
