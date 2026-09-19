"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ProductGrid } from "./product-grid";
import type { Product } from "@/modules/products/types";
import { useTranslations } from "next-intl";

export interface FeaturedProductsSectionProps {
  products: Product[];
  categories?: { id: string; label: string; count?: number }[];
  favoriteProductIds?: string[];
}

export function FeaturedProductsSection({
  products,
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

  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <Badge
            variant="secondary"
            size="sm"
            className="mb-2 uppercase font-semibold tracking-wider text-[10px]"
          >
            {t("catalogHighlights")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {t("featuredProducts")}
          </h2>
        </div>

        {tabs.length > 1 && (
          <Tabs
            tabs={tabs}
            activeTab={activeCategoryTab}
            onChange={setActiveCategoryTab}
          />
        )}
      </div>

      <ProductGrid products={filteredProducts} favoriteProductIds={favoriteProductIds} />
    </section>
  );
}
