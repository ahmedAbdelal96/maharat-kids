"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProductVariant } from "@/modules/products/types";

type ProductVariantSelectionContextValue = {
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant | null) => void;
};

const ProductVariantSelectionContext = createContext<ProductVariantSelectionContextValue | null>(null);

export function ProductVariantSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const value = useMemo(() => ({ selectedVariant, setSelectedVariant }), [selectedVariant]);
  return <ProductVariantSelectionContext.Provider value={value}>{children}</ProductVariantSelectionContext.Provider>;
}

export function useProductVariantSelection() {
  return useContext(ProductVariantSelectionContext);
}
