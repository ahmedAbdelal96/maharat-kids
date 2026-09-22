"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/modules/products/types";
import { addProductToCart } from "@/modules/cart/server/actions";
import { FavoriteButton } from "@/modules/favorites/components/favorite-button";
import { getInventoryState } from "@/modules/inventory/domain/inventory";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { PriceDisplay } from "@/components/ecommerce/price-display";
import { useProductVariantSelection } from "./product-variant-selection";

export interface ProductDetailActionsProps {
  product: Product;
  currency?: "SAR" | "EGP";
  initialFavorite?: boolean;
  onVariantChange?: (variant: NonNullable<Product["variants"]>[number] | null) => void;
}

export function ProductDetailActions({ product, currency: currencyProp, initialFavorite = false, onVariantChange }: ProductDetailActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const t = useTranslations("products");
  const router = useRouter();
  const locale = useLocale();
  const variantSelection = useProductVariantSelection();
  const activeOptions = (product.options ?? []).filter((option) => option.isActive && option.values.some((value) => value.isActive));
  const variantProducts = (product.variants ?? []).filter((variant) => variant.active && variant.options.every((entry) => product.options?.find((option) => option.id === entry.optionId)?.values.find((value) => value.id === entry.valueId)?.isActive));
  const selectedVariant = variantProducts.find((variant) => activeOptions.length > 0 && activeOptions.every((option) => selection[option.id] && variant.options.some((value) => value.optionId === option.id && value.valueId === selection[option.id])));
  const complete = activeOptions.length === 0 || Boolean(selectedVariant && Object.keys(selection).length === activeOptions.length);
  const purchasableVariants = variantProducts.filter((variant) => !variant.trackInventory || variant.stockQuantity > 0);
  const currency = currencyProp ?? "SAR";
  const effectivePrice = (variant: NonNullable<Product["variants"]>[number]) => variant.marketPrices.find((entry) => entry.market === (currency === "EGP" ? "EGYPT" : "SAUDI_ARABIA"))?.price ?? product.price;
  const displayPrice = selectedVariant ? effectivePrice(selectedVariant) : purchasableVariants.length ? Math.min(...purchasableVariants.map((variant) => Number(effectivePrice(variant)))).toFixed(2) : product.price;
  const displayCompare = selectedVariant ? selectedVariant.marketPrices.find((entry) => entry.market === (currency === "EGP" ? "EGYPT" : "SAUDI_ARABIA"))?.compareAtPrice ?? product.compareAtPrice : null;
  const outOfStock = product.variants?.length ? purchasableVariants.length === 0 : getInventoryState(product) === "OUT_OF_STOCK";
  function isValueAvailable(optionId: string, valueId: string) { return variantProducts.some((variant) => (!variant.trackInventory || variant.stockQuantity > 0) && variant.options.some((entry) => entry.optionId === optionId && entry.valueId === valueId) && activeOptions.every((option) => option.id === optionId || !selection[option.id] || variant.options.some((entry) => entry.optionId === option.id && entry.valueId === selection[option.id]))); }
  const selectedVariantAvailable = Boolean(selectedVariant && (!selectedVariant.trackInventory || selectedVariant.stockQuantity > 0));
  const digitalUnavailable = product.fulfillmentType === "DIGITAL" && !(product.digitalAssets?.some((asset) => asset.status === "ACTIVE" && (!selectedVariant || asset.variantId === null || asset.variantId === selectedVariant.id)) ?? false);
  useEffect(() => {
    const nextVariant = selectedVariant ?? null;
    onVariantChange?.(nextVariant);
    variantSelection?.setSelectedVariant(nextVariant);
  }, [onVariantChange, selectedVariant, variantSelection]);
  async function add() { setBusy(true); setError(""); setAdded(false); if (!complete || (product.variants?.length && (!selectedVariant || !selectedVariantAvailable))) { setError(locale === "ar" ? "هذا الاختيار غير متوفر حالياً." : "This combination is currently unavailable."); setBusy(false); return; } const result = await addProductToCart({ productId: product.id, variantId: selectedVariant?.id ?? null, quantity }); if (!result.success) setError(result.error.message); else { setAdded(true); router.refresh(); } setBusy(false); }

  return (
    <div className="space-y-4 border-t border-[var(--border)] pt-4">
      {activeOptions.length > 0 && <div className="space-y-4" aria-label={locale === "ar" ? "خيارات المنتج" : "Product options"}>{activeOptions.map((option) => <fieldset key={option.id} className="space-y-2"><legend className="text-sm font-bold">{locale === "ar" ? option.nameAr : option.nameEn}</legend><div className="flex flex-wrap gap-2">{option.values.filter((value) => value.isActive).map((value) => { const active = selection[option.id] === value.id; const available = isValueAvailable(option.id, value.id); return <button key={value.id} type="button" disabled={!available} aria-pressed={active} onClick={() => setSelection((current) => ({ ...current, [option.id]: value.id }))} className={`min-h-10 rounded-[var(--radius-md)] border px-3 text-sm font-semibold transition-colors ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"} ${!available ? "cursor-not-allowed opacity-35 line-through" : "hover:border-[var(--primary)]"}`}>{locale === "ar" ? value.labelAr : value.labelEn}</button>; })}</div></fieldset>)}</div>}
      <div className="flex items-end justify-between gap-3"><div><PriceDisplay price={displayPrice} originalPrice={displayCompare} currency={currency} size="lg" />{product.variants?.length && !selectedVariant && purchasableVariants.length > 1 && <p className="mt-1 text-xs text-[var(--text-secondary)]">{locale === "ar" ? "يبدأ من السعر الظاهر" : "Starting from the displayed price"}</p>}</div>{selectedVariant && <span className="text-xs font-mono text-[var(--text-secondary)]">{selectedVariant.sku}</span>}</div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Quantity selector */}
        <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] h-11">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3.5 h-full text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label={t("decreaseQuantity")}
          >
            -
          </button>
          <span className="w-10 text-center text-sm font-bold text-[var(--text-primary)] select-none">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="px-3.5 h-full text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label={t("increaseQuantity")}
          >
            +
          </button>
        </div>

        {/* Add to Cart CTA */}
        <Button
          variant="primary"
          size="lg"
          disabled={outOfStock || digitalUnavailable || busy || !complete || Boolean(product.variants?.length && (!selectedVariant || !selectedVariantAvailable))}
          onClick={() => void add()}
          className="flex-1 gap-2 h-11 shadow-sm active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{outOfStock || digitalUnavailable ? t("outOfStockAction") : t("addToCartAction")}</span>
        </Button>

        <FavoriteButton productId={product.id} productName={product.name} isFavorite={isFavorite} isAvailable={product.status === "ACTIVE"} mode="button" onChange={setIsFavorite} className="h-11 w-full shrink-0 sm:w-auto" />
      </div>
      {error && <p role="alert" className="text-xs text-[var(--destructive)]">{error}</p>}
      {added && !error && <p role="status" className="text-xs font-semibold text-[var(--success)]">{t("savedToCart")}</p>}
    </div>
  );
}
