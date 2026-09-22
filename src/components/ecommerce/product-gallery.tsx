"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import type { ProductImage as ProductImageRecord } from "@/modules/products/types";
import { useProductVariantSelection } from "./product-variant-selection";

export function ProductGallery({ productName, images, variantImageIds }: { productName: string; images: ProductImageRecord[]; variantImageIds?: string[] }) {
  const [activeSelection, setActiveSelection] = useState({ key: "", index: 0 });
  const selection = useProductVariantSelection();
  const contextImageIds = selection?.selectedVariant?.imageIds ?? [];
  const selectedImageIds = variantImageIds ?? contextImageIds;
  const variantImages = selectedImageIds.length > 0 ? selectedImageIds.map((id) => images.find((image) => image.id === id)).filter((image): image is ProductImageRecord => Boolean(image)) : [];
  const visibleImages = variantImages.length > 0 ? variantImages : images;
  const selectionKey = selectedImageIds.join("|");
  const safeActiveIndex = activeSelection.key === selectionKey
    ? Math.min(activeSelection.index, Math.max(visibleImages.length - 1, 0))
    : 0;
  const activeImage = visibleImages[safeActiveIndex] ?? visibleImages[0];

  return (
    <div className="space-y-3">
      <ProductImage
        key={activeImage?.id ?? "placeholder"}
        src={activeImage?.url}
        alt={activeImage?.altText || productName}
        aspectRatio="square"
        priority
        fit="contain"
      />
      {visibleImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3" aria-label={productName}>
          {visibleImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`${productName} ${index + 1}`}
              aria-pressed={safeActiveIndex === index}
              onClick={() => setActiveSelection({ key: selectionKey, index })}
              className={`rounded-[var(--radius-md)] border p-1 transition-all ${safeActiveIndex === index ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}
            >
              <ProductImage src={image.url} alt={image.altText || productName} aspectRatio="square" fit="contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
