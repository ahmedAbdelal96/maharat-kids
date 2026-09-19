import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  linkText?: string;
  linkHref?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  badge,
  title,
  description,
  linkText,
  linkHref,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10",
        align === "center" && "text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("space-y-2 max-w-2xl", align === "center" && "mx-auto")}>
        {badge && (
          <Badge variant="secondary" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">
            {badge}
          </Badge>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>

      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline shrink-0 group"
        >
          <span>{linkText}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
