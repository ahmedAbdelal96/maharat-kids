import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PromotionalBannerProps {
  badge?: string;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  image?: string;
}

export function PromotionalBanner({
  badge = "Featured Spotlight",
  title = "Curated Selection. Premium Quality.",
  description = "Discover our signature products crafted with precision and durable materials.",
  ctaText = "Explore Collection",
  ctaHref = "/products",
  image = "/placeholders/banner-placeholder.svg",
}: PromotionalBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-r from-[var(--surface-card)] via-[var(--surface)] to-[var(--primary-soft)] border border-[var(--border)] p-8 sm:p-12 lg:p-16 my-12 shadow-[var(--shadow-card)]">
      <div className="relative z-10 max-w-xl space-y-4">
        <Badge
          variant="accent"
          size="sm"
          className="gap-1.5 uppercase font-semibold tracking-wider text-[11px] shadow-xs"
        >
          <Sparkles className="h-3 w-3" />
          {badge}
        </Badge>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h2>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>

        <div className="pt-2">
          <Link href={ctaHref}>
            <Button size="lg" className="gap-2 shadow-[var(--shadow-glow)]">
              <span>{ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative Image in Background on larger viewports */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block opacity-40 dark:opacity-25 pointer-events-none">
          <Image
          src={image}
            alt={title}
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-card)] via-[var(--surface-card)]/40 to-transparent" />
      </div>
    </div>
  );
}
