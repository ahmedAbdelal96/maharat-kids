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

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
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

  const roots = categories.data.filter((category) => category.parentId === null);
  const featured = products.data.items;
  const tabs = [
    { id: "all", label: "All Items", count: featured.length },
    ...roots.map((category) => ({ id: category.slug, label: category.name })),
  ];
  const description = settings.data.seoDescription || `Browse ${settings.data.name}'s active catalog.`;
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

      <ScrollReveal><section><SectionHeader badge="Collections" title="Browse by Category" description="Explore active products organized by category." linkText="View all categories" linkHref="/categories" />{roots.length > 0 ? <CategoryGrid categories={roots} /> : <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">Categories will appear here when the catalog is configured.</p>}</section></ScrollReveal>
      <ScrollReveal><section>{featured.length > 0 ? <FeaturedProductsSection products={featured} categories={tabs} favoriteProductIds={favoriteIds} /> : <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center"><h2 className="text-xl font-bold">Featured Products</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">No featured products are published yet.</p></div>}</section></ScrollReveal>
      <ScrollReveal><PromotionalBanner title="A considered catalog for everyday needs" description="Explore real products with clear pricing, current availability, and a straightforward path to checkout." /></ScrollReveal>
      <ScrollReveal><section className="grid items-center gap-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:grid-cols-2"><div className="space-y-4"><Badge variant="secondary" size="sm" className="uppercase font-semibold tracking-wider text-[10px]">Store Standard</Badge><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">A Clear, Reliable Catalog</h2><p className="text-sm leading-relaxed text-[var(--text-secondary)]">Products, pricing, availability, and category structure are managed from the store administration.</p><div className="grid gap-4 pt-4 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div><h4 className="text-xs font-bold">Verified Catalog</h4><p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Server-backed product data</p></div></div><div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5"><Zap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div><h4 className="text-xs font-bold">Order Ready</h4><p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Availability checked at checkout</p></div></div></div></div><div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] lg:aspect-square"><Image src="/placeholders/banner-placeholder.svg" alt="Store catalog showcase" fill sizes="(max-width: 1024px) 100vw, 32rem" className="object-cover" /></div></section></ScrollReveal>
      <ScrollReveal><TrustSection /></ScrollReveal>
      <ScrollReveal><NewsletterSection /></ScrollReveal>
    </div>
  );
}
