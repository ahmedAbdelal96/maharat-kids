import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/modules/categories/types";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export interface CategoryCardProps {
  category: Category;
  priority?: boolean;
  className?: string;
}

export async function CategoryCard({ category, priority = false, className }: CategoryCardProps) {
  const t = await getTranslations("common.catalog");
  return (
    <Link
      href={`/categories/${category.slug}`}
      data-testid="category-card"
      className={cn(
        "group relative flex flex-col justify-end overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-muted)] p-4 sm:p-5 min-h-[160px] sm:min-h-[180px] border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/40",
        className,
      )}
    >
      {/* Background Image with Subtle Brand-Aware Gradient */}
      <Image
        src={category.imageUrl || "/placeholders/category-placeholder.svg"}
        alt={category.name}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--foreground)]/90 via-[var(--foreground)]/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex items-end justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--text-inverse)]/15 backdrop-blur-xs text-[11px] font-semibold text-[var(--text-inverse)] mb-1.5">
            {category.childCount > 0
              ? `${category.childCount} ${category.childCount === 1 ? t("collection") : t("collections")}`
              : `${category.productCount} ${t("products")}`}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-inverse)] tracking-tight">
            {category.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-inverse)]/80">
            {category.description || t("browseCategory")}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--text-inverse)]/20 backdrop-blur-md text-[var(--text-inverse)] transition-all duration-300 group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)] group-hover:scale-110 shadow-xs">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
