import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { BookOpen, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isLocale, type Locale } from "@/config/locale";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { getPublicBlogCategories, getPublicBlogPosts } from "@/modules/blog/server/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const raw = (await params).locale;
  const locale: Locale = isLocale(raw) ? raw : "ar";
  return {
    title: locale === "ar" ? "مدونة مهارة طفل | نصائح وأفكار تربوية" : "Maharat Kids Blog | Parenting & Learning Insights",
    description: locale === "ar" ? "مقالات تربوية وأفكار عملية لتنمية مهارات الأطفال والقراءة المبكرة." : "Practical ideas and insights for raising curious minds and early literacy.",
    alternates: localizedAlternates("/blog", locale),
    openGraph: { url: localizedUrl("/blog", locale), type: "website" },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale: Locale = isLocale((await params).locale) ? ((await params).locale as Locale) : "ar";
  const isAr = locale === "ar";
  const [posts, categories] = await Promise.all([getPublicBlogPosts(), getPublicBlogCategories()]);
  if (!posts.success) throw posts.error;
  if (!categories.success) throw categories.error;

  return (
    <div className="space-y-10">
      {/* Editorial Header */}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-subtle)] to-[var(--primary-soft)]/20 p-6 sm:p-10 lg:p-12 shadow-[var(--shadow-card)]">
        <div className="max-w-2xl space-y-3">
          <Badge variant="coral" size="sm" className="gap-1.5 font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isAr ? "مدونة التربية والتعليم" : "Learning & Parenting Blog"}</span>
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "أفكار تثري رحلة تعلّم طفلك" : "Insights for Growing Curious Minds"}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {isAr
              ? "مقالات متخصصة في تنمية المهارات، تشجيع حب القراءة، وأنشطة تفاعلية وممتعة للأسرة والمربين."
              : "Expert advice on skill-building, nurturing a love for books, and engaging home activities for parents and educators."}
          </p>
        </div>
      </header>

      {/* Category Pills */}
      {categories.data.length > 0 && (
        <nav aria-label="Blog categories" className="flex items-center gap-2 overflow-x-auto pb-2 ps-1">
          <Link
            href="/blog"
            className="shrink-0 rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-[var(--primary-foreground)] shadow-xs"
          >
            {isAr ? "جميع المقالات" : "All Articles"}
          </Link>
          {categories.data.map((category) => (
            <Link
              key={category.id}
              href={`/blog?category=${category.slug}`}
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {isAr ? category.nameAr : category.nameEn}
            </Link>
          ))}
        </nav>
      )}

      {/* Posts Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.data.items.map((post) => {
          const title = isAr ? post.titleAr : post.titleEn || post.titleAr;
          const excerpt = isAr ? post.excerptAr : post.excerptEn || post.excerptAr;
          const categoryName = post.category ? (isAr ? post.category.nameAr : post.category.nameEn) : (isAr ? "مقال تربوي" : "Learning Article");
          const date = post.publishedAt
            ? new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(post.publishedAt))
            : null;

          return (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30"
            >
              <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--surface-muted)]">
                  {post.coverUrl ? (
                    <Image
                      src={post.coverUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                      <BookOpen className="h-10 w-10 text-[var(--primary)]/40" />
                    </div>
                  )}
                  <span className="absolute top-3 start-3 rounded-full bg-[var(--surface)]/95 px-2.5 py-1 text-[10px] font-bold text-[var(--primary)] shadow-xs backdrop-blur-xs">
                    {categoryName}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  {date && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{date}</span>
                    </div>
                  )}

                  <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                    {title}
                  </h2>

                  {excerpt && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {excerpt}
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
                    <span>{isAr ? "اقرأ المقال كاملًا" : "Read Full Article"}</span>
                    <ArrowRight className="h-3 w-3 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            </article>
          );
        })}

        {posts.data.items.length === 0 && (
          <div className="col-span-full rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--text-secondary)]">
            {isAr ? "لا توجد مقالات منشورة حالياً في هذا القسم." : "No articles published in this section yet."}
          </div>
        )}
      </section>
    </div>
  );
}
