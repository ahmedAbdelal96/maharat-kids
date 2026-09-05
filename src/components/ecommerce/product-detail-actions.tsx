"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/modules/products/types";
import { addProductToCart } from "@/modules/cart/server/actions";
import { FavoriteButton } from "@/modules/favorites/components/favorite-button";
import { getInventoryState } from "@/modules/inventory/domain/inventory";

export interface ProductDetailActionsProps {
  product: Product;
  initialFavorite?: boolean;
}

export function ProductDetailActions({ product, initialFavorite = false }: ProductDetailActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const router = useRouter();
  const outOfStock = getInventoryState(product) === "OUT_OF_STOCK";
  async function add() { setBusy(true); setError(""); setAdded(false); const result = await addProductToCart({ productId: product.id, quantity }); if (!result.success) setError(result.error.message); else { setAdded(true); router.refresh(); } setBusy(false); }

  return (
    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Quantity selector */}
        <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] h-11">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3.5 h-full text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
            aria-label="Decrease quantity"
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
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Cart CTA */}
        <Button
          variant="primary"
          size="lg"
          disabled={outOfStock || busy}
          onClick={() => void add()}
          className="flex-1 gap-2 h-11 shadow-sm active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{outOfStock ? "Out of stock" : "Add to Cart"}</span>
        </Button>

        <FavoriteButton productId={product.id} productName={product.name} isFavorite={isFavorite} isAvailable={product.status === "ACTIVE"} mode="button" onChange={setIsFavorite} className="h-11 w-full shrink-0 sm:w-auto" />
      </div>
      {error && <p role="alert" className="text-xs text-[var(--destructive)]">{error}</p>}
      {added && !error && <p role="status" className="text-xs font-semibold text-[var(--success)]">Saved to your cart. You can keep shopping or open Cart to continue.</p>}
    </div>
  );
}
