import { ProductCard } from "./product-card";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/modules/products/types";
import { cn } from "@/lib/utils";

export interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  currency: string;
  onAddToCart?: (product: Product, quantity?: number) => void;
  favoriteProductIds?: string[];
  onFavoriteChange?: (product: Product, isFavorite: boolean) => void;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ProductGrid({
  products,
  isLoading = false,
  currency,
  onAddToCart,
  favoriteProductIds = [],
  onFavoriteChange,
  columns = 4,
  className,
}: ProductGridProps) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  };

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 sm:gap-5", columnClasses[columns], className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-3.5 bg-[var(--surface-card)]"
          >
            <Skeleton className="aspect-square w-full rounded-[var(--radius-md)]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="pt-2 flex items-center justify-between">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-8 w-16 rounded-[var(--radius-md)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <StaggerContainer
      className={cn("grid gap-4 sm:gap-5", columnClasses[columns], className)}
    >
      {products.map((product, index) => (
        <StaggerItem key={product.id}>
          <ProductCard
            product={product}
            currency={currency}
            priority={index === 0}
            onAddToCart={onAddToCart}
            initialFavorite={favoriteProductIds.includes(product.id)}
            onFavoriteChange={onFavoriteChange}
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
