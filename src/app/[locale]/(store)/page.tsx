import { ScrollReveal } from "@/components/motion";
import { SectionHeader } from "@/components/shared/section-header";
import { CategoryGrid } from "@/components/ecommerce/category-grid";
import { FeaturedProductsSection } from "@/components/ecommerce/featured-products-section";
import { HeroCarousel } from "@/components/ecommerce/hero-carousel";
import { DiscoverChildSection } from "@/components/ecommerce/discover-child-section";
import { DigitalLibraryBanner } from "@/components/ecommerce/digital-library-banner";
import { LearningBlogHighlights } from "@/components/ecommerce/learning-blog-highlights";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd } from "@/lib/seo";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import { getPublicHeroPromotions } from "@/modules/promotions/server/queries";
import { getCatalogTaxonomy } from "@/modules/catalog/server/queries";
import { getPublicBlogPosts } from "@/modules/blog/server/queries";
import { resolveMarket } from "@/modules/market/server/resolver";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const t = await getTranslations("storefront");
  const locale = await getLocale();
  const [categories, products, settings, favoriteIds, heroPromotions, skills, ageGroups, blogPostsResult, market] = await Promise.all([
    getPublicCategories(),
    getPublicProducts({ featured: true, pageSize: 8 }),
    getPublicStoreSettings(),
    getCurrentCustomerFavoriteIds(),
    getPublicHeroPromotions(),
    getCatalogTaxonomy("skill", true),
    getCatalogTaxonomy("ageGroup", true),
    getPublicBlogPosts(undefined, 1),
    resolveMarket(),
  ]);

  if (!categories.success) throw categories.error;
  if (!products.success) throw products.error;
  if (!settings.success) throw settings.error;

  const roots = categories.data.filter((category) => category.parentId === null && category.showInNavigation);
  // Curate 6-8 high-value categories for Home to keep it clean and fast
  const curatedCategories = roots.slice(0, 8);
  const featured = products.data.items.slice(0, 4);
  const tabs = [
    { id: "all", label: t("featuredProducts"), count: featured.length },
    ...roots.slice(0, 4).map((category) => ({ id: category.slug, label: category.name })),
  ];
  const description = locale === "ar"
    ? "أدوات للتعلّم واللعب ومنتجات مختارة بعناية لعقول تنمو كل يوم."
    : "Learning tools, creative play, and thoughtful products chosen for growing minds.";
  const heroList = heroPromotions.success ? heroPromotions.data : [];
  const posts = blogPostsResult.success ? blogPostsResult.data.items : [];

  return (
    <div className="space-y-10 sm:space-y-14 lg:space-y-16">
      <JsonLd data={organizationJsonLd(settings.data)} />
      
      {/* 1. Compact Hero Banner */}
      <HeroCarousel
        promotions={heroList}
        fallbackStoreName={settings.data.name}
        fallbackDescription={description}
        fallbackImageUrl={roots[0]?.imageUrl}
      />

      {/* 2. Unified Discovery: Age + Skill Combined */}
      <ScrollReveal>
        <DiscoverChildSection ageGroups={ageGroups} skills={skills} />
      </ScrollReveal>

      {/* 3. Curated Category Mosaic (6-8 categories max) */}
      <ScrollReveal>
        <section>
          <SectionHeader
            badge={t("collections")}
            title={t("browseByCategory")}
            description={t("categoryDescription")}
            linkText={t("viewAllCategories")}
            linkHref="/categories"
          />
          {curatedCategories.length > 0 ? (
            <CategoryGrid categories={curatedCategories} />
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">
              {t("emptyCategories")}
            </p>
          )}
        </section>
      </ScrollReveal>

      {/* 4. Featured Educational Products (Balanced 4-card row) */}
      <ScrollReveal>
        <section>
          {featured.length > 0 ? (
              <FeaturedProductsSection
                products={featured}
                currency={market.configuration.currency}
                categories={tabs}
              favoriteProductIds={favoriteIds}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
              <h2 className="text-xl font-bold">{t("featuredProducts")}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("emptyFeatured")}</p>
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* 5. Compact Digital Library Spotlight */}
      <ScrollReveal>
        <DigitalLibraryBanner />
      </ScrollReveal>

      {/* 6. Learning Blog Highlights (max 3, only if articles exist) */}
      {posts.length > 0 && (
        <ScrollReveal>
          <LearningBlogHighlights posts={posts.slice(0, 3)} />
        </ScrollReveal>
      )}
    </div>
  );
}
