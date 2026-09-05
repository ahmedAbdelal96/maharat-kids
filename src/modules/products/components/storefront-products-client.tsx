"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
};

function flattenCategories(categories: Category[] = [], parentId: string | null = null, depth = 0): { category: Category; depth: number }[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .flatMap((category) => [{ category, depth }, ...flattenCategories(categories, category.id, depth + 1)]);
}

export function StorefrontProductsClient({ page, categories = [], currency, filters, favoriteProductIds = [] }: { page: ProductPage; categories?: Category[]; currency: string; filters: Filters; favoriteProductIds?: string[] }) {
  const router = useRouter();
  const search = filters.search ?? "";
  const selectedCategory = filters.categorySlug ?? "all";
  const minPrice = filters.minPrice ?? "";
  const maxPrice = filters.maxPrice ?? "";
  const inStockOnly = filters.inStock ?? false;
  const categoryOptions = flattenCategories(categories);

  function pushFilters(overrides: Partial<Filters> & { page?: number } = {}) {
    const next = { search, categorySlug: selectedCategory === "all" ? "" : selectedCategory, minPrice, maxPrice, inStock: inStockOnly, ...overrides };
    const params = new URLSearchParams();
    if (next.search?.trim()) params.set("q", next.search.trim());
    if (next.categorySlug) params.set("category", next.categorySlug);
    if (next.minPrice) params.set("min", next.minPrice);
    if (next.maxPrice) params.set("max", next.maxPrice);
    if (next.inStock) params.set("inStock", "true");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  return <div className="space-y-8"><div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end"><div><Badge variant="secondary" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">Catalog</Badge><h1 className="mt-2 text-3xl font-extrabold tracking-tight">{search ? `Search results for "${search}"` : "Explore All Products"}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">{search ? `${page.total} matching product${page.total === 1 ? "" : "s"}.` : `Showing ${page.items.length} of ${page.total} active products.`}</p></div><Button variant="outline" size="sm" onClick={() => document.getElementById("catalog-filters")?.classList.toggle("hidden")} className="gap-2 lg:hidden"><SlidersHorizontal className="h-4 w-4" />Filters</Button></div><div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-4"><aside id="catalog-filters" className="hidden space-y-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 lg:sticky lg:top-24 lg:block"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider">Search Catalog</label><SearchBar placeholder="Search products..." defaultValue={search} onSearch={(term) => pushFilters({ search: term, page: 1 })} /></div><div className="space-y-1"><p className="mb-2 text-xs font-bold uppercase tracking-wider">Category</p><button type="button" onClick={() => pushFilters({ categorySlug: "", page: 1 })} className={`flex w-full justify-between rounded-md px-3 py-2 text-xs ${selectedCategory === "all" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--surface-muted)]"}`}><span>All Categories</span><span>{page.total}</span></button>{categoryOptions.map(({ category, depth }) => <button key={category.id} type="button" onClick={() => pushFilters({ categorySlug: category.slug, page: 1 })} className={`flex w-full justify-between rounded-md px-3 py-2 text-left text-xs ${selectedCategory === category.slug ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--surface-muted)]"}`}><span style={{ paddingLeft: `${depth * 12}px` }}>{category.name}</span><span>{category.productCount}</span></button>)}</div><div className="space-y-2 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold uppercase tracking-wider">Price Range</p><div className="grid grid-cols-2 gap-2"><input defaultValue={minPrice} id="min-price" placeholder="Min" inputMode="decimal" className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" /><input defaultValue={maxPrice} id="max-price" placeholder="Max" inputMode="decimal" className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" /></div><Button type="button" variant="outline" size="sm" className="w-full" onClick={() => pushFilters({ minPrice: (document.getElementById("min-price") as HTMLInputElement)?.value ?? "", maxPrice: (document.getElementById("max-price") as HTMLInputElement)?.value ?? "", page: 1 })}>Apply price</Button></div><label className="flex items-center gap-2 border-t border-[var(--border)] pt-4 text-xs"><input type="checkbox" checked={inStockOnly} onChange={(event) => pushFilters({ inStock: event.target.checked, page: 1 })} />In stock only</label></aside><div className="lg:col-span-3">{(selectedCategory !== "all" || inStockOnly || search || minPrice || maxPrice) && <div className="mb-5 flex flex-wrap items-center gap-2 text-xs"><span className="text-[var(--text-secondary)]">Active filters:</span>{selectedCategory !== "all" && <Badge variant="secondary" className="gap-1">Category: {selectedCategory}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ categorySlug: "", page: 1 })} /></Badge>}{inStockOnly && <Badge variant="secondary" className="gap-1">In stock<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ inStock: false, page: 1 })} /></Badge>}{search && <Badge variant="secondary" className="gap-1">Search: {search}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ search: "", page: 1 })} /></Badge>}{(minPrice || maxPrice) && <Badge variant="secondary" className="gap-1">Price {minPrice || "0"} - {maxPrice || "∞"}<X className="h-3 w-3 cursor-pointer" onClick={() => pushFilters({ minPrice: "", maxPrice: "", page: 1 })} /></Badge>}</div>}{page.items.length === 0 ? <EmptyState title={search ? `No products found for "${search}"` : "No products found"} description="Try fewer words, check the spelling, or browse the categories." action={<div className="flex flex-wrap justify-center gap-2"><Link href="/products"><Button variant="outline" size="sm">Browse all products</Button></Link><Link href="/categories"><Button size="sm">Browse categories</Button></Link></div>} /> : <ProductGrid products={page.items} currency={currency} favoriteProductIds={favoriteProductIds} columns={3} />}{page.totalPages > 1 && <nav aria-label="Product pagination" className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => pushFilters({ page: page.page - 1 })}>Previous</Button><span className="text-xs font-semibold text-[var(--text-secondary)]">Page {page.page} of {page.totalPages}</span><Button variant="outline" size="sm" disabled={page.page >= page.totalPages} onClick={() => pushFilters({ page: page.page + 1 })}>Next</Button></nav>}</div></div></div>;
}
