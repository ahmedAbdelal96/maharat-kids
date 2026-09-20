"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Search, X, LoaderCircle, Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/formatters";
import { normalizeSearchQuery } from "@/modules/search/domain/normalization";
import type { SearchSuggestionCategory, SearchSuggestionProduct, SearchSuggestions } from "@/modules/search/types";
import { ProductImage } from "@/components/ecommerce/product-image";
import { useLocale, useTranslations } from "next-intl";
import { localeToIntl } from "@/config/locale";

export interface SearchBarProps {
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  onSearch?: (term: string) => void;
  suggestions?: boolean;
  onNavigate?: () => void;
}

type SuggestionItem = SearchSuggestionProduct | SearchSuggestionCategory;

function availabilityLabel(value: SearchSuggestionProduct["availability"], labels: { outOfStock: string; lowStock: string; available: string; inStock: string }): string {
  if (value === "OUT_OF_STOCK") return labels.outOfStock;
  if (value === "LOW_STOCK") return labels.lowStock;
  if (value === "AVAILABLE") return labels.available;
  return labels.inStock;
}

function isProduct(item: SuggestionItem): item is SearchSuggestionProduct {
  return item.type === "product";
}

export function SearchBar({
  placeholder,
  className,
  defaultValue = "",
  onSearch,
  suggestions = false,
  onNavigate,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [result, setResult] = useState<SearchSuggestions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [requestError, setRequestError] = useState(false);
  const requestId = useRef(0);
  const containerRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const availabilityLabels = useTranslations("common.availability");
  const numberLocale = localeToIntl(locale === "en" ? "en" : "ar");
  const normalizedQuery = normalizeSearchQuery(query);
  const items = useMemo<SuggestionItem[]>(() => [...(result?.products ?? []), ...(result?.categories ?? [])], [result]);

  useEffect(() => {
    if (!suggestions || normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setRequestError(false);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(normalizedQuery)}&locale=${locale}`, { signal: controller.signal });
        if (!response.ok) throw new Error("SUGGESTIONS_FAILED");
        const nextResult = await response.json() as SearchSuggestions;
        if (currentRequest === requestId.current) {
          setResult(nextResult);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (currentRequest === requestId.current) {
          setResult({ query: normalizedQuery, products: [], categories: [] });
          setRequestError(true);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, normalizedQuery, suggestions]);

  useEffect(() => {
    if (!suggestions) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [suggestions]);

  function navigateTo(href: string) {
    setIsOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function submitSearch(term = query) {
    const normalized = normalizeSearchQuery(term);
    setIsOpen(false);
    setActiveIndex(-1);
    if (onSearch) {
      onSearch(normalized);
    } else if (normalized) {
      onNavigate?.();
      router.push(`/products?q=${encodeURIComponent(normalized)}`);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const selected = items[activeIndex];
    if (suggestions && isOpen && selected) {
      navigateTo(isProduct(selected) ? `/products/${selected.slug}` : `/categories/${selected.slug}`);
      return;
    }
    submitSearch();
  }

  function handleQueryChange(value: string) {
    const nextValue = suggestions ? value.slice(0, 100) : value;
    setQuery(nextValue);
    if (!suggestions || normalizeSearchQuery(nextValue).length < 2) {
      setResult(null);
      setIsLoading(false);
      setRequestError(false);
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions) return;
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = items[activeIndex];
      if (isOpen && selected) {
        navigateTo(isProduct(selected) ? `/products/${selected.slug}` : `/categories/${selected.slug}`);
      } else {
        submitSearch();
      }
    }
  }

  const showSuggestions = suggestions && isOpen && normalizedQuery.length >= 2;

  return (
    <form ref={containerRef} role="search" onSubmit={handleSubmit} className={cn("relative flex w-full items-center", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--text-muted)]" />
      <input
        type="search"
        role={suggestions ? "combobox" : undefined}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => { if (showSuggestions || result) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t("searchCatalog")}
        aria-label={placeholder ?? t("searchCatalog")}
        maxLength={suggestions ? 100 : undefined}
        aria-autocomplete={suggestions ? "list" : undefined}
        aria-controls={suggestions ? "search-suggestions" : undefined}
        aria-expanded={suggestions ? showSuggestions : undefined}
        aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
        className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/50 pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
      {isLoading && <LoaderCircle aria-label={t("loadingSuggestions")} className="absolute right-3.5 h-4 w-4 animate-spin text-[var(--primary)]" />}
      {!isLoading && query && <button type="button" onClick={() => { setQuery(""); setResult(null); setIsOpen(false); }} className="absolute right-3 p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus:outline-none" aria-label={t("clearSearch")}><X className="h-3.5 w-3.5" /></button>}

      {showSuggestions && (
        <div id="search-suggestions" role="listbox" aria-label={t("searchSuggestions")} className="absolute left-0 top-full z-50 mt-2 max-h-[min(28rem,calc(100vh-8rem))] w-full min-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-2 shadow-[var(--shadow-lg)]">
          {isLoading && <p className="px-3 py-4 text-xs text-[var(--text-secondary)]">{t("lookingForMatches")}</p>}
          {!isLoading && requestError && <p className="px-3 py-4 text-xs text-[var(--text-secondary)]">{t("suggestionsUnavailable")}</p>}
          {!isLoading && !requestError && items.length === 0 && <div className="px-3 py-3"><p className="text-xs font-semibold text-[var(--text-primary)]">{t("noQuickMatches")}</p><button type="button" onClick={() => submitSearch()} className="mt-1 text-left text-xs font-semibold text-[var(--primary)] hover:underline">{t("searchAllProducts", { query: normalizedQuery })}</button></div>}
          {!isLoading && !requestError && result && result.products.length > 0 && <div><p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("products")}</p>{result.products.map((product, index) => <Link key={product.id} id={`search-suggestion-${index}`} role="option" aria-selected={activeIndex === index} href={`/products/${product.slug}`} onClick={() => { setIsOpen(false); onNavigate?.(); }} className={cn("flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)]", activeIndex === index && "bg-[var(--surface-muted)]")}><ProductImage src={product.imageUrl ?? undefined} alt="" className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{product.name}</span><span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">{formatMoney(product.price, result.currency ?? "SAR", numberLocale)}</span>{product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && <span className="text-[var(--text-muted)] line-through">{formatMoney(product.compareAtPrice, result.currency ?? "SAR", numberLocale)}</span>}<span>{availabilityLabel(product.availability, { outOfStock: availabilityLabels("outOfStock"), lowStock: availabilityLabels("lowStock"), available: availabilityLabels("available"), inStock: availabilityLabels("inStock") })}</span>{product.ratingSummary && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />{product.ratingSummary.average.toFixed(1)} ({product.ratingSummary.count})</span>}</span></span></Link>)}</div>}
          {!isLoading && !requestError && result && result.categories.length > 0 && <div><p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("categories")}</p>{result.categories.map((category, categoryIndex) => { const index = (result.products?.length ?? 0) + categoryIndex; return <Link key={category.id} id={`search-suggestion-${index}`} role="option" aria-selected={activeIndex === index} href={`/categories/${category.slug}`} onClick={() => { setIsOpen(false); onNavigate?.(); }} className={cn("block rounded-[var(--radius-md)] px-2.5 py-2 text-xs transition-colors hover:bg-[var(--surface-muted)]", activeIndex === index && "bg-[var(--surface-muted)]")}><span className="block font-semibold text-[var(--text-primary)]">{category.name}</span>{category.parentName && <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{category.parentName} &gt; {category.name}</span>}</Link>; })}</div>}
          {!isLoading && !requestError && <button type="button" onClick={() => submitSearch()} className="mt-1 block min-h-11 w-full border-t border-[var(--border-subtle)] px-3 py-3 text-left text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-muted)]">{t("viewAllResults", { query: normalizedQuery })}</button>}
        </div>
      )}
    </form>
  );
}
