import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductRatingProps {
  rating: number;
  reviewCount?: number;
  showCount?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ProductRating({
  rating,
  reviewCount,
  showCount = true,
  size = "sm",
  className,
}: ProductRatingProps) {
  const roundedRating = Math.round(rating * 10) / 10;
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-center text-[var(--accent)]">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= Math.round(rating)
                ? "fill-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--border)]",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-[var(--text-primary)]">
        {roundedRating.toFixed(1)}
      </span>
      {showCount && typeof reviewCount === "number" && (
        <span className="text-xs text-[var(--text-muted)]">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
