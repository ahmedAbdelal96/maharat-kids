import { Link } from "@/i18n/navigation";
import { appConfig } from "@/config/app.config";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BookOpen, Sparkles, ShieldCheck, Truck } from "lucide-react";

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
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--foreground)] mt-auto">
      {/* Trust Mini-Banner */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                {locale === "ar" ? "كتب وألعاب هادفة" : "Meaningful Books & Toys"}
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {locale === "ar" ? "مختارة بعناية للأطفال" : "Chosen for growing minds"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[#8c5600]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                {locale === "ar" ? "كتب رقمية فورية" : "Instant Digital Books"}
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {locale === "ar" ? "متاح في مكتبتك الرقمية بعد تأكيد الدفع" : "Available in your digital library after payment is confirmed."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green-soft)] text-[var(--brand-green)]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                {locale === "ar" ? "شحن سريع موثوق" : "Fast Reliable Delivery"}
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {locale === "ar" ? "لكافة مدن المملكة ومصر" : "Across Saudi Arabia & Egypt"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-pink-soft)] text-[var(--brand-pink)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                {locale === "ar" ? "دفع آمن 100%" : "100% Secure Checkout"}
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {locale === "ar" ? "مدى، بطاقات ائتمانية، وتحويل" : "Mada, Cards, and Transfer"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info (Col span 2) */}
          <div className="space-y-4 lg:col-span-2">
            <Link href="/" className="transition-opacity hover:opacity-85 inline-block" aria-label="Maharat Kids home">
              <BrandLockup variant="footer" />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-green-soft)] px-3 py-1 text-xs font-bold text-[#1b6138]">
              <span>نتعلم • نلعب • نتطور</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
              {locale === "ar"
                ? "متجر مهارات طفل التعليمي — وجهتكم الأولى لاكتشاف أفضل الألعاب التعليمية والكتب التفاعلية والأنشطة الرقمية التي تنمي مهارات أطفالكم الذهنية والحركية واللغوية."
                : "Maharat Kids Educational Store — your primary destination to discover high-quality learning toys, interactive books, and digital activities that develop children's cognitive, motor, and language skills."}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {locale === "ar" ? "تسوق واستكشف" : "Shop & Discover"}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
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
              <li>
                <Link href="/products?type=digital" className="hover:text-[var(--primary)] transition-colors">
                  {locale === "ar" ? "الكتب والأنشطة الرقمية" : "Digital Books & Activities"}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[var(--primary)] transition-colors">
                  {locale === "ar" ? "مدونة مهارات طفل" : "Learning Blog"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Area */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t("account")}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li>
                <Link href="/account" className="hover:text-[var(--primary)] transition-colors">
                  {t("account")}
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-[var(--primary)] transition-colors">
                  {t("orders")}
                </Link>
              </li>
              <li>
                <Link href="/account/digital-library" className="hover:text-[var(--primary)] transition-colors">
                  {locale === "ar" ? "مكتبتي الرقمية" : "Digital Library"}
                </Link>
              </li>
              <li>
                <Link href="/account/favorites" className="hover:text-[var(--primary)] transition-colors">
                  {t("favorites")}
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[var(--primary)] transition-colors">
                  {t("cart")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Management & Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {locale === "ar" ? "بوابة النظام" : "System Portal"}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
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
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {currentYear} {storeName} ({locale === "ar" ? "مهارة طفل" : "Maharat Kids"}). {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[var(--brand-green)]">{locale === "ar" ? "نتعلم • نلعب • نتطور" : "Learn • Play • Grow"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

