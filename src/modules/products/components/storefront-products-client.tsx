"use client";

import { useMemo, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { SlidersHorizontal, X, RotateCcw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import type { Category } from "@/modules/categories/types";
import type { ProductPage } from "../types";

type Filters = {
  search?: string;
  categorySlug?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  ageMonths?: string;
  skillId?: string;
  productTypeId?: string;
  language?: string;
};

function flattenCategories(categories: Category[] = [], parentId: string | null = null, depth = 0): { category: Category; depth: number }[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .flatMap((category) => [{ category, depth }, ...flattenCategories(categories, category.id, depth + 1)]);
}

const AGE_FILTER_OPTIONS = [
  { value: "", labelAr: "كل الأعمار", labelEn: "All Ages" },
  { value: "24", labelAr: "٠ - ٢ سنة (السنوات الأولى)", labelEn: "0-2 Years (Infant/Toddler)" },
  { value: "48", labelAr: "٣ - ٥ سنوات (الروضة)", labelEn: "3-5 Years (Preschool)" },
  { value: "72", labelAr: "٦ - ٨ سنوات (المرحلة الابتدائية)", labelEn: "6-8 Years (Early Primary)" },
  { value: "108", labelAr: "٩ - ١٢ سنة (الناشئة)", labelEn: "9-12 Years (Junior)" },
];

export function StorefrontProductsClient({
  page,
  categories = [],
  taxonomy,
  currency,
  filters,
  favoriteProductIds = [],
}: {
  page: ProductPage;
  categories?: Category[];
  taxonomy: {
    skills: Array<{ id: string; nameAr: string; nameEn: string }>;
    productTypes: Array<{ id: string; nameAr: string; nameEn: string }>;
  };
  currency: string;
  filters: Filters;
  favoriteProductIds?: string[]
}) {
  const router = useRouter();
  const t = useTranslations("products");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const search = filters.search ?? "";
  const selectedCategory = filters.categorySlug ?? "all";
  const minPrice = filters.minPrice ?? "";
  const maxPrice = filters.maxPrice ?? "";
  const inStockOnly = filters.inStock ?? false;
  const ageMonths = filters.ageMonths ?? "";
  const skillId = filters.skillId ?? "";
  const productTypeId = filters.productTypeId ?? "";
  const language = filters.language ?? "";

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategoryName = categoryOptions.find(({ category }) => category.slug === selectedCategory)?.category.name ?? selectedCategory;
  const selectedSkillName = taxonomy.skills.find((s) => s.id === skillId)?.[isAr ? "nameAr" : "nameEn"];
  const selectedTypeName = taxonomy.productTypes.find((p) => p.id === productTypeId)?.[isAr ? "nameAr" : "nameEn"];
  const selectedAgeLabel = AGE_FILTER_OPTIONS.find((a) => a.value === ageMonths)?.[isAr ? "labelAr" : "labelEn"];

  const hasActiveFilters =
    selectedCategory !== "all" ||
    inStockOnly ||
    search ||
    minPrice ||
    maxPrice ||
    ageMonths ||
    skillId ||
    productTypeId ||
    language;

  function pushFilters(overrides: Partial<Filters> & { page?: number } = {}) {
    const next = {
      search,
      categorySlug: selectedCategory === "all" ? "" : selectedCategory,
      minPrice,
      maxPrice,
      inStock: inStockOnly,
      ageMonths,
      skillId,
      productTypeId,
      language,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.search?.trim()) params.set("q", next.search.trim());
    if (next.categorySlug) params.set("category", next.categorySlug);
    if (next.minPrice) params.set("min", next.minPrice);
    if (next.maxPrice) params.set("max", next.maxPrice);
    if (next.inStock) params.set("inStock", "true");
    if (next.ageMonths) params.set("age", next.ageMonths);
    if (next.skillId) params.set("skill", next.skillId);
    if (next.productTypeId) params.set("type", next.productTypeId);
    if (next.language) params.set("language", next.language);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  function clearAllFilters() {
    router.push("/products");
  }

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Search within catalog */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {t("searchCatalog")}
        </label>
        <SearchBar
          placeholder={t("searchPlaceholder")}
          defaultValue={search}
          onSearch={(term) => pushFilters({ search: term, page: 1 })}
        />
      </div>

      {/* Category Tree */}
      <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>{t("category")}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => pushFilters({ categorySlug: "", page: 1 })}
          className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
            selectedCategory === "all"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>{t("allCategories")}</span>
          <span className="text-[11px] opacity-80">{page.total}</span>
        </button>
        <div className="space-y-0.5 max-h-56 overflow-y-auto ps-1 pe-1">
          {categoryOptions.map(({ category, depth }) => {
            const isSelected = selectedCategory === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => pushFilters({ categorySlug: category.slug, page: 1 })}
                className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span style={{ paddingInlineStart: `${depth * 10}px` }}>{category.name}</span>
                <span className="text-[11px] opacity-75">{category.productCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Educational Age Group */}
      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {isAr ? "المرحلة العمرية" : "Age Group"}
        </label>
        <select
          aria-label={isAr ? "تصفية حسب العمر" : "Filter by age"}
          value={ageMonths}
          onChange={(event) => pushFilters({ ageMonths: event.target.value, page: 1 })}
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] shadow-xs focus:border-[var(--primary)] focus:outline-none"
        >
          {AGE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {isAr ? opt.labelAr : opt.labelEn}
            </option>
          ))}
        </select>
      </div>

      {/* Developmental Skills */}
      {taxonomy.skills.length > 0 && (
        <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            {isAr ? "المهارة المستهدفة" : "Target Skill"}
          </label>
          <select
            aria-label={isAr ? "تصفية حسب المهارة" : "Filter by skill"}
            value={skillId}
            onChange={(event) => pushFilters({ skillId: event.target.value, page: 1 })}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] shadow-xs focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">{isAr ? "جميع المهارات" : "All Skills"}</option>
            {taxonomy.skills.map((item) => (
              <option key={item.id} value={item.id}>
                {isAr ? item.nameAr : item.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Product Type / Format */}
      {taxonomy.productTypes.length > 0 && (
        <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            {isAr ? "نوع المنتج" : "Product Type"}
          </label>
          <select
            aria-label={isAr ? "تصفية حسب نوع المنتج" : "Filter by product type"}
            value={productTypeId}
            onChange={(event) => pushFilters({ productTypeId: event.target.value, page: 1 })}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] shadow-xs focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">{isAr ? "جميع الأنواع" : "All Types"}</option>
            {taxonomy.productTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {isAr ? item.nameAr : item.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Language Filter */}
      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {isAr ? "لغة الكتاب أو اللعبة" : "Product Language"}
        </label>
        <select
          aria-label={isAr ? "تصفية حسب لغة المنتج" : "Filter by product language"}
          value={language}
          onChange={(event) => pushFilters({ language: event.target.value, page: 1 })}
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] shadow-xs focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="">{isAr ? "جميع اللغات" : "All Languages"}</option>
          <option value="ARABIC">{isAr ? "العربية" : "Arabic"}</option>
          <option value="ENGLISH">{isAr ? "الإنجليزية" : "English"}</option>
          <option value="BILINGUAL">{isAr ? "ثنائي اللغة (عربي/إنجليزي)" : "Bilingual"}</option>
          <option value="LANGUAGE_INDEPENDENT">{isAr ? "بدون لغة (رموز ومجسمات)" : "Language Independent"}</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {t("priceRange")} ({currency})
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            defaultValue={minPrice}
            id="min-price"
            aria-label={t("min")}
            placeholder={t("min")}
            inputMode="decimal"
            className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          />
          <input
            defaultValue={maxPrice}
            id="max-price"
            aria-label={t("max")}
            placeholder={t("max")}
            inputMode="decimal"
            className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs font-semibold cursor-pointer"
          onClick={() =>
            pushFilters({
              minPrice: (document.getElementById("min-price") as HTMLInputElement)?.value ?? "",
              maxPrice: (document.getElementById("max-price") as HTMLInputElement)?.value ?? "",
              page: 1,
            })
          }
        >
          {t("applyPrice")}
        </Button>
      </div>

      {/* In stock only toggle */}
      <label className="flex items-center gap-2.5 border-t border-[var(--border-subtle)] pt-4 text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => pushFilters({ inStock: event.target.checked, page: 1 })}
          className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
        />
        <span>{t("inStockOnly")}</span>
      </label>

      {/* Reset button */}
      {hasActiveFilters && (
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="w-full gap-2 text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isAr ? "إعادة ضبط الفلاتر" : "Reset all filters"}</span>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
              {t("catalogLabel")}
            </Badge>
            <span className="text-xs font-semibold text-[var(--text-muted)]">•</span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {page.total} {isAr ? "منتج تعليمي" : "Educational Products"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {search ? t("searchResultsFor", { query: search }) : t("exploreAll")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {search
              ? t("matchingProducts", { count: page.total })
              : t("showingProducts", { visible: page.items.length, total: page.total })}
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileFilterOpen(true)}
          className="gap-2 lg:hidden font-semibold"
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />
          <span>{t("filters")}</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
          )}
        </Button>
      </div>

      {/* Main Layout: Filters Sidebar + Grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-4">
        {/* Desktop Sidebar */}
        <aside className="hidden space-y-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 lg:sticky lg:top-24 lg:block shadow-xs">
          {filterSidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileFilterOpen(false)}
            />
            <div className="relative ms-auto flex h-full w-full max-w-xs flex-col bg-[var(--surface-card)] p-5 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-4">
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />
                  <span>{t("filters")}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {filterSidebarContent}

              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <Button
                  className="w-full font-bold"
                  onClick={() => setMobileFilterOpen(false)}
                >
                  {isAr ? "عرض النتائج" : "Show Results"} ({page.total})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Listing & Active Chips */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filters Row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 text-xs">
              <span className="font-bold text-[var(--text-secondary)]">{t("activeFilters")}:</span>
              
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{t("categoryFilter", { category: selectedCategoryName })}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ categorySlug: "", page: 1 })} />
                </Badge>
              )}

              {ageMonths && (
                <Badge variant="age" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{selectedAgeLabel || ageMonths}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ ageMonths: "", page: 1 })} />
                </Badge>
              )}

              {skillId && (
                <Badge variant="skill" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{selectedSkillName || skillId}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ skillId: "", page: 1 })} />
                </Badge>
              )}

              {productTypeId && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{selectedTypeName || productTypeId}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ productTypeId: "", page: 1 })} />
                </Badge>
              )}

              {inStockOnly && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{t("inStockOnly")}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ inStock: false, page: 1 })} />
                </Badge>
              )}

              {search && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{t("searchFilter", { query: search })}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ search: "", page: 1 })} />
                </Badge>
              )}

              {(minPrice || maxPrice) && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 font-semibold">
                  <span>{t("priceFilter", { min: minPrice || "0", max: maxPrice || "∞" })}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-[var(--destructive)]" onClick={() => pushFilters({ minPrice: "", maxPrice: "", page: 1 })} />
                </Badge>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="ms-auto text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {isAr ? "مسح الكل" : "Clear all"}
              </button>
            </div>
          )}

          {/* Grid or Empty */}
          {page.items.length === 0 ? (
            <EmptyState
              title={search ? t("noProductsFor", { query: search }) : t("noResults")}
              description={t("noProductsDescription")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    {t("browseAll")}
                  </Button>
                  <Link href="/categories">
                    <Button size="sm">{t("browseCategories")}</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <ProductGrid
              products={page.items}
              currency={currency}
              favoriteProductIds={favoriteProductIds}
              columns={3}
            />
          )}

          {/* Pagination */}
          {page.totalPages > 1 && (
            <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-center gap-3 pt-6 border-t border-[var(--border-subtle)]">
              <Button
                variant="outline"
                size="sm"
                disabled={page.page <= 1}
                onClick={() => pushFilters({ page: page.page - 1 })}
                className="font-semibold cursor-pointer"
              >
                {t("previous")}
              </Button>
              <span className="text-xs font-semibold text-[var(--text-secondary)] px-3">
                {t("page", { current: page.page, total: page.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page.page >= page.totalPages}
                onClick={() => pushFilters({ page: page.page + 1 })}
                className="font-semibold cursor-pointer"
              >
                {t("next")}
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
