import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { ProductGallery } from "@/components/ecommerce/product-gallery";
import { PriceDisplay } from "@/components/ecommerce/price-display";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductDetailActions } from "@/components/ecommerce/product-detail-actions";
import { ProductDetailTabs } from "@/components/ecommerce/product-detail-tabs";
import { Breadcrumbs } from "@/components/ecommerce/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, breadcrumbJsonLd, localizedAlternates, localizedUrl, productJsonLd, storeMetadata } from "@/lib/seo";
import { isLocale, type Locale } from "@/config/locale";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProduct, getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import { getParticipatingPromotionForProduct } from "@/modules/promotions/server/queries";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCustomerReviewEligibility, getPublicProductReviews } from "@/modules/reviews/server/queries";
import { ProductReviews } from "@/modules/reviews/components/product-reviews";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ar";
  const [product, settings] = await Promise.all([getPublicProduct(slug), getPublicStoreSettings()]);
  if (!product.success || !settings.success || !product.data) return {};
  const title = `${product.data.name} | ${settings.data.name}`;
  const description = product.data.description || product.data.shortDescription || `Shop ${product.data.name}.`;
  const path = `/products/${product.data.slug}`;
  const url = localizedUrl(path, locale);
  const image = product.data.images.find((item) => item.isPrimary)?.url || product.data.images[0]?.url;
  return storeMetadata(settings.data, { title, description, alternates: localizedAlternates(path, locale), openGraph: { title, description, url, type: "website", images: image ? [{ url: absoluteUrl(image), alt: product.data.name }] : undefined } });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ar";
  const navigation = await getTranslations("navigation");
  const t = await getTranslations("storefront");
  const availability = await getTranslations("common.availability");
  const [product, categories, allProducts, settings, favoriteIds] = await Promise.all([getPublicProduct(slug), getPublicCategories(), getPublicProducts({ pageSize: 48 }), getPublicStoreSettings(), getCurrentCustomerFavoriteIds()]);
  if (!product.success) throw product.error;
  if (!categories.success) throw categories.error;
  if (!allProducts.success) throw allProducts.error;
  if (!settings.success) throw settings.error;
  if (!product.data) notFound();
  const current = product.data;

  const promoResult = await getParticipatingPromotionForProduct(current.id);
  const activePromo = promoResult.success ? promoResult.data : null;
  const [publicReviews, customerEligibility] = await Promise.all([getPublicProductReviews(current.id), getCustomerReviewEligibility(current.id)]);

  const categoryMap = new Map(categories.data.map((category) => [category.id, category]));
  const breadcrumbCategories = [];
  let cursor = current.categoryId ? categoryMap.get(current.categoryId as never) ?? null : null;
  while (cursor) { breadcrumbCategories.unshift(cursor); cursor = cursor.parentId ? categoryMap.get(cursor.parentId) ?? null : null; }
  const related = allProducts.data.items.filter((item) => item.id !== current.id && item.categoryId === current.categoryId).slice(0, 3);
  const available = !current.trackInventory || current.stockQuantity > 0;
  const breadcrumbItems = [{ name: navigation("home"), href: "/" }, { name: navigation("products"), href: "/products" }, ...breadcrumbCategories.map((category) => ({ name: category.name, href: `/categories/${category.slug}` })), { name: current.name, href: `/products/${current.slug}` }];
  const structuredBreadcrumbItems = breadcrumbItems.map((item) => ({ ...item, href: localizedUrl(item.href, locale) }));
  return (
    <div className="space-y-12">
      <Breadcrumbs items={breadcrumbItems} />
      <JsonLd data={breadcrumbJsonLd(structuredBreadcrumbItems)} />
      <JsonLd data={productJsonLd(current, settings.data, publicReviews.success ? publicReviews.data.summary : undefined, locale)} />
      
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery productName={current.name} images={current.images} />
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {current.categoryName || t("catalogHighlights")}
            </span>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight">{current.name}</h1>
            <p className={`mt-3 text-sm font-semibold ${available ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}>
              {available ? (current.trackInventory ? t("stockAvailable", { count: current.stockQuantity }) : availability("available")) : availability("outOfStock")}
            </p>
            <div className="mt-4">
              <PriceDisplay price={current.price} originalPrice={current.compareAtPrice} size="xl" />
            </div>

            {/* Promotional Offer Callout */}
            {activePromo && (
              <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary-soft)]/20 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                      <span className="text-xs font-bold text-[var(--primary)]">{t("specialPromotion")}</span>
                    </div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{activePromo.name}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{activePromo.shortDescription}</p>
                  </div>
                  {activePromo.showOnOffersPage && (
                    <Link
                      href={`/offers/${activePromo.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline shrink-0"
                    >
                      <span>{t("viewOffer")}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              {current.description || current.shortDescription || ""}
            </p>
          </div>

          <ProductDetailActions product={current} initialFavorite={favoriteIds.includes(current.id)} />
          
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[var(--primary)]" />{t("delivery")}</div>
            <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-[var(--primary)]" />{t("returns")}</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--primary)]" />{t("secure")}</div>
          </div>
        </div>
      </div>

      <ProductDetailTabs product={current} />
      {publicReviews.success && <ProductReviews productId={current.id} initialReviews={publicReviews.data} eligibility={customerEligibility.success ? customerEligibility.data : null} />}
      {related.length > 0 && (
        <section className="space-y-5 border-t border-[var(--border)] pt-10">
          <h2 className="text-xl font-bold">{t("relatedProducts")}</h2>
          <ProductGrid products={related} currency={settings.data.currency} favoriteProductIds={favoriteIds} columns={3} />
        </section>
      )}
    </div>
  );
}
