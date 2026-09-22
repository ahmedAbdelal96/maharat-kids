"use client";

import { useState } from "react";
import { ShoppingBag, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "./price-display";
import { ProductImage } from "./product-image";
import type { Product } from "@/modules/products/types";
import { getPrimaryProductImage } from "@/modules/products/types";
import { FavoriteButton } from "@/modules/favorites/components/favorite-button";
import { useTranslations } from "next-intl";

export interface QuickViewModalProps {
  product: Product | null;
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  initialFavorite?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

export function QuickViewModal({
  product,
  currency,
  isOpen,
  onClose,
  onAddToCart,
  initialFavorite = false,
  onFavoriteChange,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const t = useTranslations("products");
  const catalog = useTranslations("common.catalog");
  const storefront = useTranslations("storefront");

  if (!product) return null;

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Product Image Preview */}
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <ProductImage
            src={getPrimaryProductImage(product.images)?.url}
            alt={product.name}
            aspectRatio="square"
            priority
          />
          {product.status === "ACTIVE" && (
            <Badge
              variant="age"
              size="sm"
              className="absolute top-3 start-3 flex items-center gap-1 shadow-xs"
            >
              <Sparkles className="h-3 w-3" />
              {catalog("new")}
            </Badge>
          )}
        </div>

        {/* Details & Options */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {product.categoryName || t("catalogLabel")}
            </span>
            <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
              {product.name}
            </h2>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)]">{product.sku ?? t("catalogLabel")}</span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span
                className={`text-xs font-medium ${
                  (!product.trackInventory || product.stockQuantity > 0)
                    ? "text-[var(--success)]"
                    : "text-[var(--destructive)]"
                }`}
              >
                {!product.trackInventory ? storefront("productAvailable") : product.stockQuantity > 0 ? storefront("stockAvailable", { count: product.stockQuantity }) : t("outOfStockAction")}
              </span>
            </div>

            <div className="mt-3">
              <PriceDisplay
                price={product.price}
                originalPrice={product.compareAtPrice}
                currency={currency}
                size="lg"
              />
            </div>

            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              {product.shortDescription || product.description}
            </p>
          </div>

          {/* Quantity & CTA */}
          <div className="pt-3 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label={t("decreaseQuantity")}
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-semibold text-[var(--text-primary)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label={t("increaseQuantity")}
                >
                  +
                </button>
              </div>

              <Button
                variant="primary"
                className="flex-1 gap-2"
                disabled={product.status !== "ACTIVE" || (product.trackInventory && product.stockQuantity < 1)}
                onClick={handleAdd}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>{product.status === "ACTIVE" && (!product.trackInventory || product.stockQuantity > 0) ? t("addToCartAction") : t("outOfStockAction")}</span>
              </Button>
              <FavoriteButton productId={product.id} productName={product.name} isFavorite={initialFavorite} isAvailable={product.status === "ACTIVE"} mode="icon" onChange={onFavoriteChange} className="shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
