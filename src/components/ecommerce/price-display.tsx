import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { localeToIntl } from "@/config/locale";

export interface PriceDisplayProps {
  priceInCents?: number;
  price?: string;
  originalPriceInCents?: number;
  originalPrice?: string | null;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PriceDisplay({
  priceInCents,
  price,
  originalPriceInCents,
  originalPrice,
  currency = "USD",
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
  const discountPercent = hasDiscount ? Math.round(((originalNumber - currentNumber) / originalNumber) * 100) : 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm sm:text-base",
    lg: "text-lg sm:text-xl",
    xl: "text-2xl sm:text-3xl",
  };

  return (
    <div className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-bold tracking-tight text-[var(--text-primary)]",
          sizeClasses[size],
        )}
      >
        {formatCurrency(currentNumber * 100, currency, numberLocale)}
      </span>

      {hasDiscount && (
        <>
          <span className="text-xs sm:text-sm text-[var(--text-muted)] line-through">
            {formatCurrency(originalNumber * 100, currency, numberLocale)}
          </span>
          <span className="rounded-[var(--radius-sm)] bg-[var(--destructive-subtle)] px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-[var(--destructive)]">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
