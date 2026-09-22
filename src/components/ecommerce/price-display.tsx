import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { localeToIntl } from "@/config/locale";

export interface PriceDisplayProps {
  priceInCents?: number;
  price?: string;
  originalPriceInCents?: number;
  originalPrice?: string | null;
  currency: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PriceDisplay({
  priceInCents,
  price,
  originalPriceInCents,
  originalPrice,
  currency,
  size = "md",
  className,
}: PriceDisplayProps) {
  const locale = useLocale();
  const numberLocale = localeToIntl(locale === "en" ? "en" : "ar");
  const current = price ?? String((priceInCents ?? 0) / 100);
  const original = originalPrice ?? (originalPriceInCents === undefined ? null : String(originalPriceInCents / 100));
  const currentNumber = Number(current);
  const originalNumber = original === null ? null : Number(original);
  const hasDiscount = originalNumber !== null && originalNumber > currentNumber;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm sm:text-base",
    lg: "text-lg sm:text-xl",
    xl: "text-2xl sm:text-3xl",
  };

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0", className)}>
      <span
        className={cn(
          "font-bold tracking-tight text-[var(--text-primary)]",
          sizeClasses[size],
        )}
      >
        {formatCurrency(currentNumber * 100, currency, numberLocale)}
      </span>

      {hasDiscount && (
        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] line-through">
          {formatCurrency(originalNumber * 100, currency, numberLocale)}
        </span>
      )}
    </div>
  );
}
