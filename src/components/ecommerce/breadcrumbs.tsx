import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { BreadcrumbItem } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
      {items.map((item, index) => (
        <span key={`${item.href}-${item.name}`} className="flex items-center gap-2">
          {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3" />}
          {index === items.length - 1 ? (
            <span aria-current="page" className="font-semibold text-[var(--text-primary)]">{item.name}</span>
          ) : (
            <Link href={item.href} className="transition-colors hover:text-[var(--primary)]">{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
