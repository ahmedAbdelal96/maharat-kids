"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Package, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ecommerce/product-image";
import { formatMoney } from "@/lib/formatters";
import type { PromotionProductRef } from "../types";

import { searchProductsForPromotion } from "../server/actions";

export function ProductPickerModal({
  isOpen,
  onClose,
  onSelect,
  selectedProductId,
  title = "Select Product",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: PromotionProductRef) => void;
  selectedProductId?: string | null;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<PromotionProductRef[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function searchProducts() {
      setLoading(true);
      setError("");
      try {
        const res = await searchProductsForPromotion(query);
        if (!ignore) {
          if (res.success) {
            setProducts(res.data);
          } else {
            setError(res.error.message || "Failed to search products");
          }
        }
      } catch {
        if (!ignore) setError("Could not load products. Please try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      void searchProducts();
    }, 200);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Choose a catalog product for this commercial offer rule."
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Search by product name or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs"
            autoFocus
          />
        </div>

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

        <div className="max-h-80 overflow-y-auto space-y-1.5 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border)] p-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-[var(--text-muted)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--primary)]" /> Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-muted)]">
              <Package className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)] opacity-50" />
              No matching products found.
            </div>
          ) : (
            products.map((p) => {
              const isSelected = p.id === selectedProductId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    onClose();
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] p-2.5 transition-colors hover:bg-[var(--surface-muted)] ${
                    isSelected ? "bg-[var(--primary-soft)]/40 border border-[var(--primary)]/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface-muted)]">
                      <ProductImage src={p.imageUrl ?? undefined} alt={p.name} aspectRatio="square" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{p.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                        <span>{formatMoney(p.price, "USD")}</span>
                        {p.trackInventory ? (
                          <span className={p.stockQuantity > 0 ? "text-[var(--success)]" : "text-[var(--destructive)]"}>
                            {p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : "Out of stock"}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Untracked stock</span>
                        )}
                        {p.status !== "ACTIVE" && <Badge variant="secondary" size="sm">Draft</Badge>}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
