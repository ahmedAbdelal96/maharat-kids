"use client";

import { useMemo } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
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

export function StorefrontProductsClient({ page, categories = [], taxonomy, currency, filters, favoriteProductIds = [] }: { page: ProductPage; categories?: Category[]; taxonomy: { skills: Array<{ id: string; nameAr: string; nameEn: string }>; productTypes: Array<{ id: string; nameAr: string; nameEn: string }> }; currency: string; filters: Filters; favoriteProductIds?: string[] }) {
  const router = useRouter();
  const t = useTranslations("products");
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

  function pushFilters(overrides: Partial<Filters> & { page?: number } = {}) {
    const next = { search, categorySlug: selectedCategory === "all" ? "" : selectedCategory, minPrice, maxPrice, inStock: inStockOnly, ageMonths, skillId, productTypeId, language, ...overrides };
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <Badge variant="secondary" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">{t("catalogLabel")}</Badge>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{search ? t("searchResultsFor", { query: search }) : t("exploreAll")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{search ? t("matchingProducts", { count: page.total }) : t("showingProducts", { visible: page.items.length, total: page.total })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => document.getElementById("catalog-filters")?.classList.toggle("hidden")} className="gap-2 lg:hidden"><SlidersHorizontal className="h-4 w-4" />{t("filters")}</Button>
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-4">
        <aside id="catalog-filters" className="hidden space-y-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 lg:sticky lg:top-24 lg:block">
          <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider">{t("searchCatalog")}</label><SearchBar placeholder={t("searchPlaceholder")} defaultValue={search} onSearch={(term) => pushFilters({ search: term, page: 1 })} /></div>
          <div className="space-y-1"><p className="mb-2 text-xs font-bold uppercase tracking-wider">{t("category")}</p><button type="button" onClick={() => pushFilters({ categorySlug: "", page: 1 })} className={`flex w-full justify-between rounded-md px-3 py-2 text-xs ${selectedCategory === "all" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--surface-muted)]"}`}><span>{t("allCategories")}</span><span>{page.total}</span></button>{categoryOptions.map(({ category, depth }) => <button key={category.id} type="button" onClick={() => pushFilters({ categorySlug: category.slug, page: 1 })} className={`flex w-full justify-between rounded-md px-3 py-2 text-left text-xs ${selectedCategory === category.slug ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--surface-muted)]"}`}><span style={{ paddingInlineStart: `${depth * 12}px` }}>{category.name}</span><span>{category.productCount}</span></button>)}</div>
          <div className="space-y-2 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold uppercase tracking-wider">{t("priceRange")}</p><div className="grid grid-cols-2 gap-2"><input defaultValue={minPrice} id="min-price" aria-label={t("min")} placeholder={t("min")} inputMode="decimal" className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" /><input defaultValue={maxPrice} id="max-price" aria-label={t("max")} placeholder={t("max")} inputMode="decimal" className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" /></div><Button type="button" variant="outline" size="sm" className="w-full" onClick={() => pushFilters({ minPrice: (document.getElementById("min-price") as HTMLInputElement)?.value ?? "", maxPrice: (document.getElementById("max-price") as HTMLInputElement)?.value ?? "", page: 1 })}>{t("applyPrice")}</Button></div>
          <label className="flex items-center gap-2 border-t border-[var(--border)] pt-4 text-xs"><input type="checkbox" checked={inStockOnly} onChange={(event) => pushFilters({ inStock: event.target.checked, page: 1 })} />{t("inStockOnly")}</label>
          <div className="space-y-2 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold uppercase tracking-wider">Educational filters</p><select aria-label="Filter by age" value={ageMonths} onChange={(event) => pushFilters({ ageMonths: event.target.value, page: 1 })} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="">Any age</option><option value="48">4 years</option><option value="72">6 years</option><option value="96">8 years</option></select><select aria-label="Filter by skill" value={skillId} onChange={(event) => pushFilters({ skillId: event.target.value, page: 1 })} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="">Any skill</option>{taxonomy.skills.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select><select aria-label="Filter by product type" value={productTypeId} onChange={(event) => pushFilters({ productTypeId: event.target.value, page: 1 })} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="">Any product type</option>{taxonomy.productTypes.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select><select aria-label="Filter by product language" value={language} onChange={(event) => pushFilters({ language: event.target.value, page: 1 })} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="">Any product language</option><option value="ARABIC">Arabic</option><option value="ENGLISH">English</option><option value="BILINGUAL">Bilingual</option><option value="LANGUAGE_INDEPENDENT">Language independent</option></select></div>
        </aside>
        <div className="lg:col-span-3">
          {(selectedCategory !== "all" || inStockOnly || search || minPrice || maxPrice) && <div className="mb-5 flex flex-wrap items-center gap-2 text-xs"><span className="text-[var(--text-secondary)]">{t("activeFilters")}:</span>{selectedCategory !== "all" && <Badge variant="secondary" className="gap-1">{t("categoryFilter", { category: selectedCategoryName })}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ categorySlug: "", page: 1 })} /></Badge>}{inStockOnly && <Badge variant="secondary" className="gap-1">{t("inStockOnly")}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ inStock: false, page: 1 })} /></Badge>}{search && <Badge variant="secondary" className="gap-1">{t("searchFilter", { query: search })}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ search: "", page: 1 })} /></Badge>}{(minPrice || maxPrice) && <Badge variant="secondary" className="gap-1">{t("priceFilter", { min: minPrice || "0", max: maxPrice || "∞" })}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ minPrice: "", maxPrice: "", page: 1 })} /></Badge>}</div>}
          {page.items.length === 0 ? <EmptyState title={search ? t("noProductsFor", { query: search }) : t("noResults")} description={t("noProductsDescription")} action={<div className="flex flex-wrap justify-center gap-2"><Link href="/products"><Button variant="outline" size="sm">{t("browseAll")}</Button></Link><Link href="/categories"><Button size="sm">{t("browseCategories")}</Button></Link></div>} /> : <ProductGrid products={page.items} currency={currency} favoriteProductIds={favoriteProductIds} columns={3} />}
          {page.totalPages > 1 && <nav aria-label={t("pagination")} className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => pushFilters({ page: page.page - 1 })}>{t("previous")}</Button><span className="text-xs font-semibold text-[var(--text-secondary)]">{t("page", { current: page.page, total: page.totalPages })}</span><Button variant="outline" size="sm" disabled={page.page >= page.totalPages} onClick={() => pushFilters({ page: page.page + 1 })}>{t("next")}</Button></nav>}
        </div>
      </div>
    </div>
  );
}
