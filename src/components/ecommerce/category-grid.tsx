import { CategoryCard } from "./category-card";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";
import type { Category } from "@/modules/categories/types";
import { cn } from "@/lib/utils";

export interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <StaggerContainer
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5",
        className,
      )}
    >
      {categories.map((category, index) => (
        <StaggerItem key={category.id}>
          <CategoryCard category={category} priority={index === 0} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
