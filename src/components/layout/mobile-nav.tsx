"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, ShoppingBag, LayoutDashboard } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { SearchBar } from "@/components/shared/search-bar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { NavLink } from "./store-header";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
}

export function MobileNav({ isOpen, onClose, links }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      title="Menu"
      description="Navigate our store and collections"
    >
      <div className="flex flex-col h-full justify-between gap-6">
        {/* Search */}
        <div>
          <SearchBar
            placeholder="Search products"
            suggestions
            onNavigate={onClose}
          />
        </div>

        {/* Links */}
        <nav className="flex flex-col space-y-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/50 hover:text-[var(--text-primary)]",
                )}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Utility Links & Theme Toggle */}
        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <Link
            href="/account"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            <User className="h-4 w-4" />
            <span>My Account</span>
          </Link>

          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>My Cart</span>
          </Link>

          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Admin Dashboard</span>
          </Link>

          <div className="flex items-center justify-between px-4 py-2 text-sm text-[var(--text-secondary)]">
            <span>Theme Preference</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
