import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw, Sparkles, ArrowRight, BookOpen, Layers, Baby, Brain } from "lucide-react";
import { PriceDisplay } from "@/components/ecommerce/price-display";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductGallery } from "@/components/ecommerce/product-gallery";
import { ProductDetailActions } from "@/components/ecommerce/product-detail-actions";
import { ProductVariantSelectionProvider } from "@/components/ecommerce/product-variant-selection";
import { ProductDetailTabs } from "@/components/ecommerce/product-detail-tabs";
import { Breadcrumbs } from "@/components/ecommerce/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, breadcrumbJsonLd, localizedAlternates, localizedUrl, productJsonLd, storeMetadata } from "@/lib/seo";
import { isLocale, type Locale } from "@/config/locale";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProduct, getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import { getParticipatingPromotionForProduct } from "@/modules/promotions/server/queries";
import { Link } from "@/i18n/navigation";
import { getCustomerReviewEligibility, getPublicProductReviews } from "@/modules/reviews/server/queries";
import { ProductReviews } from "@/modules/reviews/components/product-reviews";
import { getTranslations } from "next-intl/server";
import { resolveMarket } from "@/modules/market/server/resolver";

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
  const isAr = locale === "ar";
  const navigation = await getTranslations("navigation");
  const t = await getTranslations("storefront");
  const availability = await getTranslations("common.availability");
  const [product, categories, allProducts, settings, favoriteIds, market] = await Promise.all([
    getPublicProduct(slug),
    getPublicCategories(),
    getPublicProducts({ pageSize: 48 }),
    getPublicStoreSettings(),
    getCurrentCustomerFavoriteIds(),
    resolveMarket(),
  ]);

  if (!product.success) throw product.error;
  if (!categories.success) throw categories.error;
  if (!allProducts.success) throw allProducts.error;
  if (!settings.success) throw settings.error;
  if (!product.data) notFound();
  const current = product.data;

  const promoResult = await getParticipatingPromotionForProduct(current.id);
  const activePromo = promoResult.success ? promoResult.data : null;
  const [publicReviews, customerEligibility] = await Promise.all([
    getPublicProductReviews(current.id),
    getCustomerReviewEligibility(current.id),
  ]);

  const categoryMap = new Map(categories.data.map((category) => [category.id, category]));
  const breadcrumbCategories = [];
  let cursor = current.categoryId ? categoryMap.get(current.categoryId as never) ?? null : null;
  while (cursor) {
    breadcrumbCategories.unshift(cursor);
    cursor = cursor.parentId ? categoryMap.get(cursor.parentId) ?? null : null;
  }
  const related = allProducts.data.items
    .filter((item) => item.id !== current.id && item.categoryId === current.categoryId)
    .slice(0, 3);
  const digitalReady = current.fulfillmentType !== "DIGITAL" || (current.digitalAssets?.some((asset) => asset.status === "ACTIVE") ?? false);
  const available = digitalReady && (!current.trackInventory || current.stockQuantity > 0);
  const breadcrumbItems = [
    { name: navigation("home"), href: "/" },
    { name: navigation("products"), href: "/products" },
    ...breadcrumbCategories.map((category) => ({ name: category.name, href: `/categories/${category.slug}` })),
    { name: current.name, href: `/products/${current.slug}` },
  ];
  const structuredBreadcrumbItems = breadcrumbItems.map((item) => ({ ...item, href: localizedUrl(item.href, locale) }));

  const ageText = current.minAgeMonths != null && current.maxAgeMonths != null
    ? `${Math.floor(current.minAgeMonths / 12)} - ${Math.floor(current.maxAgeMonths / 12)} ${isAr ? "سنوات" : "Years"}`
    : current.minAgeMonths != null
    ? `+${Math.floor(current.minAgeMonths / 12)} ${isAr ? "سنوات" : "Years"}`
    : null;

  return (
    <div className="space-y-12">
      <Breadcrumbs items={breadcrumbItems} />
      <JsonLd data={breadcrumbJsonLd(structuredBreadcrumbItems)} />
      <JsonLd data={productJsonLd(current, settings.data, publicReviews.success ? publicReviews.data.summary : undefined, locale)} />
      
      {/* Product Primary Section */}
      <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
        <ProductVariantSelectionProvider>
          {/* Gallery Column */}
          <div className="lg:col-span-6">
            <ProductGallery productName={current.name} images={current.images} />
          </div>

          {/* Purchasing Info Column */}
          <div className="space-y-6 lg:col-span-6">
            <div>
              {/* Category & Age Band Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary" size="sm" className="font-bold text-[11px]">
                  <Layers className="h-3 w-3 me-1" />
                  {current.categoryName || t("catalogHighlights")}
                </Badge>
                {ageText && (
                  <Badge variant="age" size="sm" className="font-bold text-[11px]">
                    <Baby className="h-3 w-3 me-1" />
                    {isAr ? `العمر: ${ageText}` : `Age: ${ageText}`}
                  </Badge>
                )}
                {current.fulfillmentType === "DIGITAL" && (
                  <Badge variant="digital" size="sm" className="font-bold text-[11px]">
                    <BookOpen className="h-3 w-3 me-1" />
                    {isAr ? "كتاب رقمي فوري" : "Digital PDF"}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                {current.name}
              </h1>

              {/* Digital notice (zero em-dash) */}
              {current.fulfillmentType === "DIGITAL" && (
                <div className="mt-3 rounded-[var(--radius-md)] border border-[#125B78]/30 bg-[#125B78]/10 p-3 text-xs font-semibold text-[#125B78]">
                  {isAr
                    ? "منتج رقمي: سيصبح ملف الـ PDF متاحاً للتحميل والطباعة في مكتبتك فور تأكيد الدفع."
                    : "Digital product: Your printable PDF will be available in your library immediately after payment confirmation."}
                </div>
              )}

              {/* Stock Status Indicator */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${available ? "bg-[var(--success)]" : "bg-[var(--destructive)]"}`} />
                <span className={`text-xs font-bold ${available ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}>
                  {available
                    ? current.trackInventory
                      ? t("stockAvailable", { count: current.stockQuantity })
                      : availability("available")
                    : availability("outOfStock")}
                </span>
              </div>

              {/* Price without variants */}
              {!current.variants?.length && (
                <div className="mt-4">
                  <PriceDisplay
                    price={current.price}
                    originalPrice={current.compareAtPrice}
                    currency={market.configuration.currency}
                    size="xl"
                  />
                </div>
              )}

              {/* Promotional Offer Callout */}
              {activePromo && (
                <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary-soft)]/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                        <span className="text-xs font-bold text-[var(--primary)]">{t("specialPromotion")}</span>
                      </div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{activePromo.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{activePromo.shortDescription}</p>
                    </div>
                    {activePromo.showOnOffersPage && (
                      <Link
                        href={`/offers/${activePromo.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline shrink-0"
                      >
                        <span>{t("viewOffer")}</span>
                        <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Short Description */}
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {current.shortDescription || current.description || ""}
              </p>
            </div>

            {/* Actions: Variants, Stepper, Add to Cart, Favorite */}
            <ProductDetailActions
              product={current}
              currency={market.configuration.currency}
              initialFavorite={favoriteIds.includes(current.id)}
            />

            {/* 3 Trust guarantees */}
            <div className="grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="font-semibold">{t("delivery")}</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="font-semibold">{t("returns")}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="font-semibold">{t("secure")}</span>
              </div>
            </div>
          </div>
        </ProductVariantSelectionProvider>
      </div>

      {/* Educational Specifications / Pedagogical Attributes */}
      {(current.minAgeMonths != null || current.skillIds.length > 0 || current.materials || current.usageInstructions || current.dimensions || current.numberOfPieces) && (
        <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {isAr ? "المعلومات والمواصفات التعليمية" : "Educational Information & Specs"}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Column 1: Developmental Specs */}
            <div className="space-y-4">
              <dl className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 text-xs sm:text-sm">
                {ageText && (
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <dt className="font-medium text-[var(--text-secondary)]">{isAr ? "الفئة العمرية المناسبة" : "Suitable Age"}</dt>
                    <dd className="font-bold text-[var(--text-primary)]">{ageText}</dd>
                  </div>
                )}
                {current.productLanguage && (
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <dt className="font-medium text-[var(--text-secondary)]">{isAr ? "لغة المنتج" : "Language"}</dt>
                    <dd className="font-bold text-[var(--text-primary)]">
                      {current.productLanguage === "ARABIC" ? (isAr ? "العربية" : "Arabic") : current.productLanguage === "ENGLISH" ? (isAr ? "الإنجليزية" : "English") : current.productLanguage === "BILINGUAL" ? (isAr ? "ثنائي اللغة" : "Bilingual") : (isAr ? "بدون نصوص" : "Language Independent")}
                    </dd>
                  </div>
                )}
                {current.difficultyLevel && (
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <dt className="font-medium text-[var(--text-secondary)]">{isAr ? "مستوى الصعوبة" : "Difficulty Level"}</dt>
                    <dd className="font-bold text-[var(--text-primary)]">{current.difficultyLevel}</dd>
                  </div>
                )}
                {current.materials && (
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <dt className="font-medium text-[var(--text-secondary)]">{isAr ? "خامات الصنع" : "Materials"}</dt>
                    <dd className="font-bold text-[var(--text-primary)]">{current.materials}</dd>
                  </div>
                )}
                {current.numberOfPieces != null && (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-[var(--text-secondary)]">{isAr ? "عدد القطع" : "Number of Pieces"}</dt>
                    <dd className="font-bold text-[var(--text-primary)]">{current.numberOfPieces}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Column 2: Educational usage & notes */}
            <div className="space-y-4">
              {current.usageInstructions && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 text-xs sm:text-sm">
                  <h3 className="font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-[var(--primary)]" />
                    <span>{isAr ? "إرشادات الاستخدام واللعب" : "How to Use & Play"}</span>
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {current.usageInstructions}
                  </p>
                </div>
              )}

              {current.supervisionRequired && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#F3A928] shrink-0" />
                  <span>{isAr ? "يوصى بمشاركة الوالدين أو المعلم أثناء النشاط لمضاعفة الفائدة التفاعلية." : "Adult participation or supervision is recommended during this activity."}</span>
                </div>
              )}

              {current.safetyNotes && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-xs text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)] me-1">{isAr ? "ملاحظات السلامة:" : "Safety Notes:"}</span>
                  <span>{current.safetyNotes}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tabs */}
      <ProductDetailTabs product={current} />

      {/* Reviews */}
      {publicReviews.success && (
        <ProductReviews
          productId={current.id}
          initialReviews={publicReviews.data}
          eligibility={customerEligibility.success ? customerEligibility.data : null}
        />
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-6 border-t border-[var(--border)] pt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {t("relatedProducts")}
            </h2>
            <Link
              href="/products"
              className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <span>{isAr ? "عرض المزيد" : "View more"}</span>
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          </div>
          <ProductGrid
            products={related}
            currency={market.configuration.currency}
            favoriteProductIds={favoriteIds}
            columns={3}
          />
        </section>
      )}
    </div>
  );
}
