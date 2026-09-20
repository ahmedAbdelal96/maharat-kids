import Image from "next/image";
import { ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/motion";
import { SectionHeader } from "@/components/shared/section-header";
import { CategoryGrid } from "@/components/ecommerce/category-grid";
import { FeaturedProductsSection } from "@/components/ecommerce/featured-products-section";
import { PromotionalBanner } from "@/components/ecommerce/promotional-banner";
import { TrustSection } from "@/components/ecommerce/trust-section";
import { NewsletterSection } from "@/components/ecommerce/newsletter-section";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd } from "@/lib/seo";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import { getPublicHeroPromotions } from "@/modules/promotions/server/queries";
import { HeroCarousel } from "@/components/ecommerce/hero-carousel";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const t = await getTranslations("storefront");
  const locale = await getLocale();
  const [categories, products, settings, favoriteIds, heroPromotions] = await Promise.all([
    getPublicCategories(),
    getPublicProducts({ featured: true, pageSize: 12 }),
    getPublicStoreSettings(),
    getCurrentCustomerFavoriteIds(),
    getPublicHeroPromotions(),
  ]);

  if (!categories.success) throw categories.error;
  if (!products.success) throw products.error;
  if (!settings.success) throw settings.error;

  const roots = categories.data.filter((category) => category.parentId === null && category.showInNavigation);
  const featured = products.data.items;
  const tabs = [
    { id: "all", label: t("featuredProducts"), count: featured.length },
    ...roots.map((category) => ({ id: category.slug, label: category.name })),
  ];
  const description = locale === "ar"
    ? "أدوات للتعلّم واللعب ومنتجات مختارة بعناية لعقول تنمو كل يوم."
    : "Learning tools, creative play, and thoughtful products chosen for growing minds.";
  const heroList = heroPromotions.success ? heroPromotions.data : [];

  return (
    <div className="space-y-16 sm:space-y-24">
      <JsonLd data={organizationJsonLd(settings.data)} />
      
      <HeroCarousel
        promotions={heroList}
        fallbackStoreName={settings.data.name}
        fallbackDescription={description}
        fallbackImageUrl={roots[0]?.imageUrl}
      />

      <ScrollReveal><section><SectionHeader badge={t("collections")} title={t("browseByCategory")} description={t("categoryDescription")} linkText={t("viewAllCategories")} linkHref="/categories" />{roots.length > 0 ? <CategoryGrid categories={roots} /> : <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">{t("emptyCategories")}</p>}</section></ScrollReveal>
      <ScrollReveal><section>{featured.length > 0 ? <FeaturedProductsSection products={featured} categories={tabs} favoriteProductIds={favoriteIds} /> : <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center"><h2 className="text-xl font-bold">{t("featuredProducts")}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{t("emptyFeatured")}</p></div>}</section></ScrollReveal>
      <ScrollReveal><PromotionalBanner badge={locale === "ar" ? "اختيارات مميزة" : "Thoughtful picks"} title={locale === "ar" ? "منتجات تنمّي الفضول" : "Products that grow curiosity"} description={description} ctaText={locale === "ar" ? "استكشف المجموعة" : "Explore the collection"} /></ScrollReveal>
      <ScrollReveal><section className="grid items-center gap-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:grid-cols-2"><div className="space-y-4"><Badge variant="secondary" size="sm" className="font-semibold tracking-wider">{locale === "ar" ? "لماذا مهارة طفل؟" : "Why Maharat Kids"}</Badge><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{locale === "ar" ? "اختيارات تثق بها" : "Choose with confidence"}</h2><p className="text-sm leading-relaxed text-[var(--text-secondary)]">{locale === "ar" ? "تفاصيل واضحة، منتجات مدروسة، وطريق هادئ من الاكتشاف إلى التوصيل." : "Clear details, considered products, and a calm path from discovery to delivery."}</p><div className="grid gap-4 pt-4 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div><h4 className="text-xs font-bold">{locale === "ar" ? "اختيارات مدروسة" : "Thoughtfully chosen"}</h4><p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{locale === "ar" ? "لعقول فضولية" : "Made for curious minds"}</p></div></div><div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5"><Zap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div><h4 className="text-xs font-bold">{locale === "ar" ? "جاهز للاكتشاف" : "Ready for discovery"}</h4><p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{locale === "ar" ? "توفر واضح عند الطلب" : "Clear availability at checkout"}</p></div></div></div></div><div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] lg:aspect-square"><Image src="/placeholders/banner-placeholder.svg" alt={locale === "ar" ? "اختيارات تثق بها" : "Choose with confidence"} fill sizes="(max-width: 1024px) 100vw, 32rem" className="object-cover" /></div></section></ScrollReveal>
      <ScrollReveal><TrustSection /></ScrollReveal>
      <ScrollReveal><NewsletterSection /></ScrollReveal>
    </div>
  );
}
