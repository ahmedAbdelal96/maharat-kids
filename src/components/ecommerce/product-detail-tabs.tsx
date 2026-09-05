"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Product } from "@/modules/products/types";

export interface ProductDetailTabsProps {
  product: Product;
}

export function ProductDetailTabs({ product }: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const detailTabs = [
    { id: "overview", label: "Overview" },
    { id: "specs", label: "Specifications" },
    { id: "shipping", label: "Shipping & Returns" },
    { id: "reviews", label: "Reviews" },
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
              Product Details
            </h3>
            <p>{product.description}</p>
            <ul className="list-disc list-inside space-y-1.5 pt-2 text-[var(--text-primary)]">
              <li>Quality materials designed for longevity</li>
              <li>Carefully inspected and tested for performance</li>
              <li>Standard packaging with protection</li>
            </ul>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl text-xs">
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">Product ID</span>
              <span className="font-semibold text-[var(--text-primary)] font-mono">{product.sku ?? "Not assigned"}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">Category</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.categoryName ?? "Uncategorized"}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">Availability</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.trackInventory ? (product.stockQuantity > 0 ? "In Stock" : "Out of Stock") : "Available"}</span>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex justify-between">
              <span className="text-[var(--text-secondary)]">Tags</span>
              <span className="font-semibold text-[var(--text-primary)]">{product.status}</span>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-3 max-w-2xl text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>
              <strong>Delivery Information:</strong> Orders are processed promptly upon confirmation. Delivery times vary by destination.
            </p>
            <p>
              <strong>Returns Policy:</strong> Returns accepted within the standard return window in original condition and packaging.
            </p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-[var(--text-secondary)]">Verified customer reviews are shown below.</p>
          </div>
        )}
      </div>
    </div>
  );
}
