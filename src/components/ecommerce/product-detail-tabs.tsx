"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Product } from "@/modules/products/types";
import { useTranslations } from "next-intl";

export interface ProductDetailTabsProps {
  product: Product;
}

export function ProductDetailTabs({ product }: ProductDetailTabsProps) {
  const t = useTranslations("products");
  const [activeTab, setActiveTab] = useState("overview");

  const detailTabs = [
    { id: "overview", label: t("overview") },
    { id: "specs", label: t("specifications") },
    { id: "shipping", label: t("shippingReturns") },
    { id: "reviews", label: t("reviewsTab") },
  ];

  return (
    <div className="space-y-6 pt-10 border-t border-[var(--border)]">
      <Tabs
        tabs={detailTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-6 sm:p-8">
        {activeTab === "overview" && (
          <div className="space-y-4 max-w-3xl text-sm text-[var(--text-secondary)] leading-relaxed">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {t("productDetails")}
            </h3>
            <p>{product.description}</p>
            <ul className="list-disc list-inside space-y-1.5 pt-2 text-[var(--text-primary)]">
              <li>{t("qualityMaterials")}</li>
              <li>{t("inspectedTested")}</li>
              <li>{t("standardPackaging")}</li>
            </ul>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl text-xs">
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">{t("productId")}</span>
              <span className="font-semibold text-[var(--text-primary)] font-mono">{product.sku ?? t("notAssigned")}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">{t("category")}</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.categoryName ?? t("uncategorized")}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">{t("availability")}</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.trackInventory ? (product.stockQuantity > 0 ? t("inStockOnly") : t("outOfStockAction")) : t("productAvailable")}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">{t("tags")}</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.status}</span>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-3 max-w-2xl text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>
              <strong>{t("deliveryInformation")}:</strong> {t("deliveryDescription")}
            </p>
            <p>
              <strong>{t("returnsPolicy")}:</strong> {t("returnsDescription")}
            </p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-[var(--text-secondary)]">{t("verifiedReviewsDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
