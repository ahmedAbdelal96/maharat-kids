import { Link } from "@/i18n/navigation";
import { appConfig } from "@/config/app.config";
import { getTranslations } from "next-intl/server";

export interface StoreFooterProps {
  storeName?: string;
  description?: string;
}

export async function StoreFooter({
  storeName = appConfig.name,
  description = appConfig.description,
}: StoreFooterProps) {
  const currentYear = new Date().getFullYear();
  const t = await getTranslations("navigation");
  const actions = await getTranslations("common.actions");

  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-card)] text-[var(--foreground)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--text-primary)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-xs shadow-xs">
                {storeName.charAt(0)}
              </div>
              <span>{storeName}</span>
            </Link>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
              {description}
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
            <span className="text-[11px] text-[var(--text-secondary)]">{description}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
