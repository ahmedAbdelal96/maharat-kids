"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import type { ProductImage as ProductImageRecord } from "@/modules/products/types";

export function ProductGallery({ productName, images }: { productName: string; images: ProductImageRecord[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <ProductImage
        key={activeImage?.id ?? "placeholder"}
        src={activeImage?.url}
        alt={activeImage?.altText || productName}
        aspectRatio="square"
        priority
      />
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3" aria-label="Product image gallery">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={activeIndex === index}
              onClick={() => setActiveIndex(index)}
              className={`rounded-[var(--radius-md)] border p-1 transition-all ${activeIndex === index ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}
            >
              <ProductImage src={image.url} alt={image.altText || productName} aspectRatio="square" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
