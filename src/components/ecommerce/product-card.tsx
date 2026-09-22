"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Eye, ShoppingBag, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "./price-display";
import { ProductImage } from "./product-image";
import { QuickViewModal } from "./quick-view-modal";
import { getPrimaryProductImage, type Product } from "@/modules/products/types";
import { addProductToCart } from "@/modules/cart/server/actions";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "@/modules/favorites/components/favorite-button";
import { getInventoryState } from "@/modules/inventory/domain/inventory";
import { useTranslations } from "next-intl";

export interface ProductCardProps {
  product: Product;
  currency: string;
  priority?: boolean;
  onAddToCart?: (product: Product, quantity?: number) => void;
  initialFavorite?: boolean;
  onFavoriteChange?: (product: Product, isFavorite: boolean) => void;
  className?: string;
}

export function ProductCard({
  product,
  currency,
  priority = false,
  onAddToCart,
  initialFavorite = false,
  onFavoriteChange,
  className,
}: ProductCardProps) {
  const router = useRouter();
  const t = useTranslations("common.catalog");
  const availabilityT = useTranslations("common.availability");
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const handleFavoriteChange = (nextValue: boolean) => {
    setIsFavorite(nextValue);
    onFavoriteChange?.(product, nextValue);
  };

  const addItem = async (item: Product, quantity = 1) => {
    if (item.variants?.length) {
      setIsQuickViewOpen(false);
      router.push(`/products/${item.slug}`);
      return;
    }
    setAddError(null);
    setAddedMessage(false);
    if (onAddToCart) {
      onAddToCart(item, quantity);
      return;
    }

    setIsAdding(true);
    const result = await addProductToCart({ productId: item.id, quantity });
    setIsAdding(false);
    if (!result.success) {
      setAddError(result.error.message);
      return;
    }
    setAddedMessage(true);
    router.refresh();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.status !== "ACTIVE" || getInventoryState(product) === "OUT_OF_STOCK") return;
    void addItem(product);
  };

  const openQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const hasDiscount =
    product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const inventoryState = getInventoryState(product);
  const availability = product.status !== "ACTIVE" ? t("unavailable") : inventoryState === "OUT_OF_STOCK" ? availabilityT("outOfStock") : inventoryState === "LOW_STOCK" ? `${product.stockQuantity} ${t("products")}` : inventoryState === "UNTRACKED" ? availabilityT("available") : availabilityT("inStock");
  const isPurchasable = product.status === "ACTIVE" && inventoryState !== "OUT_OF_STOCK";
  const primaryImage = getPrimaryProductImage(product.images);

  return (
    <>
      <div
        data-testid="product-card"
        className={cn(
          "group relative flex flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30",
          className,
        )}
      >
        {/* Image Container with Badges and Overlay Actions */}
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          {product.status === "ACTIVE" ? (
            <Link href={`/products/${product.slug}`} className="block">
              <ProductImage src={primaryImage?.url} alt={product.name} aspectRatio="square" priority={priority} fit="contain" />
            </Link>
          ) : (
            <ProductImage src={primaryImage?.url} alt={product.name} aspectRatio="square" priority={priority} fit="contain" />
          )}

          {/* Badges */}
          <div className="absolute top-2.5 start-2.5 flex flex-col gap-1.5 pointer-events-none z-10">
            {product.fulfillmentType === "DIGITAL" && (
              <Badge variant="digital" size="sm" className="shadow-xs font-bold">
                {t("category") === "الفئة" ? "كتاب رقمي" : "Digital"}
              </Badge>
            )}
            {hasDiscount && (
              <Badge variant="coral" size="sm" className="shadow-xs font-bold">
                {t("sale")}
              </Badge>
            )}
            {product.status === "ACTIVE" && !hasDiscount && product.fulfillmentType !== "DIGITAL" && (
              <Badge variant="age" size="sm" className="shadow-xs">
                {t("new")}
              </Badge>
            )}
            {inventoryState === "OUT_OF_STOCK" && (
              <Badge variant="secondary" size="sm" className="shadow-xs">
                {t("outOfStock")}
              </Badge>
            )}
          </div>

          <FavoriteButton
            productId={product.id}
            productName={product.name}
            isFavorite={isFavorite}
            isAvailable={product.status === "ACTIVE"}
            mode="icon"
            onChange={handleFavoriteChange}
            className="absolute top-2.5 end-2.5 z-10 h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 text-[var(--text-secondary)] shadow-xs backdrop-blur-xs transition-all hover:scale-110 hover:text-[var(--destructive)] active:scale-95 cursor-pointer"
          />

          {/* Quick Actions Hover Overlay */}
          <div className="absolute inset-x-2.5 bottom-2.5 hidden sm:flex items-center justify-center gap-2 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-10">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openQuickView}
              className="bg-[var(--surface)]/95 backdrop-blur-xs shadow-md hover:bg-[var(--surface)] text-xs h-8 gap-1.5 border border-[var(--border)] rounded-full"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t("quickView")}</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {product.categoryName || t("category")}
            </span>
            <span className={`text-[11px] font-medium ${inventoryState === "OUT_OF_STOCK" ? "text-[var(--destructive)]" : inventoryState === "LOW_STOCK" ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>{availability}</span>
          </div>

          {product.status === "ACTIVE" ? (
            <Link href={`/products/${product.slug}`} className="mt-1.5">
              <h3 className="line-clamp-2 text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)] leading-snug">{product.name}</h3>
            </Link>
          ) : (
            <h3 className="mt-1.5 line-clamp-2 text-sm font-bold text-[var(--text-primary)] leading-snug">{product.name}</h3>
          )}

          {product.ratingSummary && product.ratingSummary.count > 0 && (
            <div className="mt-1.5 inline-flex w-fit items-center gap-1 text-xs" aria-label={t("ratingAria", { rating: product.ratingSummary.average.toFixed(1), count: product.ratingSummary.count })}>
              <Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
              <span className="font-semibold text-[var(--text-primary)]">{product.ratingSummary.average.toFixed(1)}</span>
              <span className="text-[var(--text-muted)]">({product.ratingSummary.count})</span>
            </div>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between gap-1.5 border-t border-[var(--border-subtle)] min-w-0">
            <div className="min-w-0 flex-1">
              <PriceDisplay
                price={product.price}
                originalPrice={product.compareAtPrice}
                currency={currency}
                size="sm"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isAdding || !isPurchasable}
              onClick={handleAddToCart}
              className="h-8 px-2.5 gap-1 text-xs shrink-0 shadow-xs cursor-pointer active:scale-[0.97]"
              aria-label={`${t("add")} ${product.name}`}
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{isAdding ? t("adding") : addedMessage ? t("added") : isPurchasable ? t("add") : t("unavailable")}</span>
            </Button>
          </div>
          {addError && (
            <p role="alert" className="mt-2 text-xs text-[var(--destructive)]">
              {addError}
            </p>
          )}
          {addedMessage && !addError && <p role="status" className="mt-2 text-xs font-semibold text-[var(--success)]">{t("savedToCart")}</p>}
        </div>
      </div>

      <QuickViewModal
        product={product}
        currency={currency}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={addItem}
        initialFavorite={isFavorite}
        onFavoriteChange={handleFavoriteChange}
      />
    </>
  );
}
