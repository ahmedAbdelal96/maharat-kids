"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ProductGrid } from "./product-grid";
import type { Product } from "@/modules/products/types";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export interface FeaturedProductsSectionProps {
  products: Product[];
  currency: string;
  categories?: { id: string; label: string; count?: number }[];
  favoriteProductIds?: string[];
}

export function FeaturedProductsSection({
  products,
  currency,
  categories,
  favoriteProductIds = [],
}: FeaturedProductsSectionProps) {
  const t = useTranslations("storefront");
  const tabs = categories ?? [{ id: "all", label: t("featuredProducts"), count: products.length }];
  const [activeCategoryTab, setActiveCategoryTab] = useState(tabs[0]?.id || "all");

  const filteredProducts =
    activeCategoryTab === "all"
      ? products
      : products.filter((p) => p.categorySlug === activeCategoryTab);

  // Take exact multiple of 4 (either 4 or 8) to prevent lonely card
  const displayCount = filteredProducts.length >= 8 ? 8 : filteredProducts.length >= 4 ? 4 : filteredProducts.length;
  const balancedProducts = filteredProducts.slice(0, displayCount);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <Badge
            variant="secondary"
            size="sm"
            className="mb-1.5 uppercase font-semibold tracking-wider text-[10px]"
          >
            {t("catalogHighlights")}
          </Badge>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {t("featuredProducts")}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {tabs.length > 1 && (
            <div className="hidden md:block">
              <Tabs
                tabs={tabs.slice(0, 4)}
                activeTab={activeCategoryTab}
                onChange={setActiveCategoryTab}
              />
            </div>
          )}
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline shrink-0"
          >
            <span>{t("viewAll")}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <ProductGrid products={balancedProducts} currency={currency} favoriteProductIds={favoriteProductIds} />
    </section>
  );
}
