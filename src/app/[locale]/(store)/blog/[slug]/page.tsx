import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { Badge } from "@/components/ui/badge";
import { isLocale, type Locale } from "@/config/locale";
import { absoluteUrl, localizedAlternates, localizedUrl } from "@/lib/seo";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicBlogPost } from "@/modules/blog/server/queries";
import { sanitizeBlogHtml } from "@/modules/blog/domain/sanitize";
import { resolveMarket } from "@/modules/market/server/resolver";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ar";
  const result = await getPublicBlogPost(slug);
  if (!result.success || !result.data) return {};
  const post = result.data;
  const title = locale === "ar" ? post.seoTitleAr || post.titleAr : post.seoTitleEn || post.titleEn;
  const description = locale === "ar" ? post.seoDescriptionAr || post.excerptAr || "" : post.seoDescriptionEn || post.excerptEn || "";
  const path = `/blog/${post.slug}`;
  return {
    title: `${title} | Maharat Kids`,
    description,
    alternates: localizedAlternates(path, locale),
    openGraph: {
      title,
      description,
      url: localizedUrl(path, locale),
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverUrl ? [{ url: absoluteUrl(post.coverUrl), alt: title }] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ar";
  const isAr = locale === "ar";
  const result = await getPublicBlogPost(slug);
  if (!result.success) throw result.error;
  if (!result.data) notFound();
  const post = result.data;

  const [productsResult, categoriesResult, market] = await Promise.all([
    getPublicProducts({ page: 1, pageSize: 48 }),
    getPublicCategories(),
    resolveMarket(),
  ]);

  if (!productsResult.success) throw productsResult.error;
  if (!categoriesResult.success) throw categoriesResult.error;

  const products = productsResult.data.items.filter((product) => post.productIds.includes(product.id));
  const categories = categoriesResult.data.filter((category) => post.storeCategoryIds.includes(category.id));
  const title = isAr ? post.titleAr : post.titleEn || post.titleAr;
  const excerpt = isAr ? post.excerptAr : post.excerptEn || post.excerptAr;
  const categoryName = post.category ? (isAr ? post.category.nameAr : post.category.nameEn) : null;
  const date = post.publishedAt
    ? new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(post.publishedAt))
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Back to Blog */}
      <div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
          <span>{isAr ? "العودة إلى المدونة" : "Back to Blog"}</span>
        </Link>
      </div>

      {/* Article Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {categoryName && (
            <Badge variant="coral" size="sm" className="font-bold">
              {categoryName}
            </Badge>
          )}
          {date && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>{date}</span>
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h1>

        {excerpt && (
          <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
            {excerpt}
          </p>
        )}
      </header>

      {/* Hero Cover Image */}
      {post.coverUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[var(--shadow-card)]">
          <Image
            src={post.coverUrl}
            alt={title}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      )}

      {/* Editorial Content with strict 720px measure */}
      <div className="mx-auto max-w-[720px]">
        <div
          className="prose prose-base sm:prose-lg max-w-none leading-relaxed text-[var(--text-primary)] dark:prose-invert"
          dangerouslySetInnerHTML={{
            __html: sanitizeBlogHtml(isAr ? post.contentAr : post.contentEn || post.contentAr),
          }}
        />

        {/* Categories Tags */}
        {categories.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-6">
            <span className="text-xs font-bold text-[var(--text-muted)]">{isAr ? "الأقسام المرتبطة:" : "Related categories:"}</span>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Products for this article */}
      {products.length > 0 && (
        <section className="space-y-6 border-t border-[var(--border)] pt-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {isAr ? "منتجات موصى بها في هذا المقال" : "Recommended Products from this Article"}
            </h2>
          </div>
          <ProductGrid products={products} currency={market.configuration.currency} columns={3} />
        </section>
      )}
    </div>
  );
}
