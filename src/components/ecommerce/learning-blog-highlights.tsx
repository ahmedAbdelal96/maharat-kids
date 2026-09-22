import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "next-intl/server";
import type { BlogPost } from "@/modules/blog/types";

export async function LearningBlogHighlights({ posts }: { posts: BlogPost[] }) {
  const locale = await getLocale();
  const isAr = locale === "ar";

  if (!posts.length) return null;

  const displayPosts = posts.slice(0, 3);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="coral" size="sm" className="mb-2 font-bold uppercase tracking-wider text-[10px]">
            {isAr ? "مدونة التربية والتعليم" : "Parenting & Learning Blog"}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "مقالات ونصائح لتنمية مهارات طفلك" : "Insights for Raising Curious Minds"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isAr
              ? "أفكار عملية، استراتيجيات قراءة، وأنشطة منزلية تثري رحلة تعلم الصغار"
              : "Practical ideas, reading strategies, and home activities to enrich early childhood learning"}
          </p>
        </div>

        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <span>{isAr ? "عرض كل المقالات" : "View all articles"}</span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayPosts.map((post) => {
          const title = isAr ? post.titleAr : post.titleEn || post.titleAr;
          const excerpt = isAr ? post.excerptAr : post.excerptEn || post.excerptAr;
          const categoryName = post.category ? (isAr ? post.category.nameAr : post.category.nameEn) : null;
          const date = post.publishedAt
            ? new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(post.publishedAt))
            : null;

          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--surface-muted)]">
                {post.coverUrl ? (
                  <Image
                    src={post.coverUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                    <BookOpen className="h-10 w-10 text-[var(--primary)]/40" />
                  </div>
                )}
                {categoryName && (
                  <span className="absolute top-3 start-3 rounded-full bg-[var(--surface)]/95 px-2.5 py-1 text-[10px] font-bold text-[var(--primary)] shadow-xs backdrop-blur-xs">
                    {categoryName}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                {date && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{date}</span>
                  </div>
                )}

                <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 leading-snug">
                  {title}
                </h3>

                {excerpt && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {excerpt}
                  </p>
                )}

                <div className="mt-auto pt-4 flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
                  <span>{isAr ? "اقرأ المزيد" : "Read more"}</span>
                  <ArrowRight className="h-3 w-3 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
