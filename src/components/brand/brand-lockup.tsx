import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandLockupVariant =
  | "header"
  | "mobile"
  | "footer"
  | "admin"
  | "auth"
  | "mark"
  | "compact"
  | "horizontal"
  | "full";

export interface BrandLockupProps {
  variant?: BrandLockupVariant;
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  priority?: boolean;
}

export function BrandLockup({
  variant,
  compact = false,
  inverse = false,
  className,
  priority = false,
}: BrandLockupProps) {
  const effectiveVariant: BrandLockupVariant =
    variant ?? (compact ? "compact" : "header");

  if (effectiveVariant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src="/brand/maharat-kids-mark.webp"
          alt="Maharat Kids | مهارة طفل"
          width={120}
          height={88}
          priority={priority}
          className="h-8 w-auto object-contain"
        />
      </span>
    );
  }

  if (effectiveVariant === "admin") {
    if (compact) {
      return (
        <span className={cn("inline-flex items-center justify-center", className)}>
          <Image
            src="/brand/maharat-kids-mark.webp"
            alt="Maharat Kids"
            width={64}
            height={47}
            priority={priority}
            className="h-7 w-auto object-contain"
          />
        </span>
      );
    }
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Image
          src="/brand/maharat-kids-mark.webp"
          alt="Maharat Kids | مهارة طفل"
          width={80}
          height={59}
          priority={priority}
          className="h-8 w-auto shrink-0 object-contain"
        />
      </span>
    );
  }

  if (effectiveVariant === "footer" || effectiveVariant === "full") {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <Image
          src="/brand/maharat-kids-logo.webp"
          alt="Maharat Kids | مهارة طفل — نتعلم • نلعب • نتطور"
          width={180}
          height={192}
          priority={priority}
          className="h-24 sm:h-28 w-auto object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  if (effectiveVariant === "auth") {
    return (
      <div className={cn("flex flex-col items-center justify-center", className)}>
        <Image
          src="/brand/maharat-kids-logo-compact.webp"
          alt="Maharat Kids | مهارة طفل"
          width={140}
          height={135}
          priority={priority || true}
          className="h-16 sm:h-20 w-auto object-contain"
        />
      </div>
    );
  }

  if (effectiveVariant === "compact") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Image
          src="/brand/maharat-kids-mark.webp"
          alt="Maharat Kids | مهارة طفل"
          width={72}
          height={53}
          priority={priority}
          className="h-7 w-auto object-contain"
        />
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-xs font-black tracking-tight",
              inverse ? "text-white" : "text-[var(--text-primary)]"
            )}
          >
            Maharat Kids
          </span>
          <span
            className={cn(
              "mt-0.5 text-[9px] font-bold",
              inverse ? "text-white/70" : "text-[var(--primary)]"
            )}
          >
            مهارة طفل
          </span>
        </span>
      </span>
    );
  }

  // Default / Header variant
  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <Image
        src="/brand/maharat-kids-logo-horizontal.webp"
        alt="Maharat Kids | مهارة طفل"
        width={220}
        height={53}
        priority={priority || true}
        className="h-9 sm:h-11 w-auto max-w-[155px] sm:max-w-[210px] object-contain transition-transform duration-200 hover:scale-[1.02]"
      />
    </span>
  );
}
