"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/search-bar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { CartDrawer } from "@/components/ecommerce/cart-drawer";
import type { Cart } from "@/modules/cart/types";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import type { StorefrontNotificationSummary } from "@/modules/notifications/types";

export interface NavLink {
  label: string;
  href: string;
}

export const STORE_NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Offers", href: "/offers" },
];

export interface StoreHeaderProps {
  storeName?: string;
  announcement?: string;
  cart?: Cart | null;
  currency?: string;
  favoriteCount?: number | null;
  favoritesHref?: string | null;
  notificationSummary?: StorefrontNotificationSummary | null;
}

export function StoreHeader({
  storeName = appConfig.name,
  announcement,
  cart = null,
  currency = "USD",
  favoriteCount = null,
  favoritesHref = "/account/favorites",
  notificationSummary = null,
}: StoreHeaderProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const totalCartCount = cart?.itemCount ?? 0;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md transition-all shadow-xs">
        {/* Optional Announcement Bar */}
        {announcement && (
          <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs py-2 px-4 text-center font-medium tracking-wide">
            {announcement}
          </div>
        )}

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open mobile menu"
              className="h-10 w-10 text-[var(--text-primary)]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Logo / Brand Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] font-black text-base shadow-xs">
              {storeName.charAt(0)}
            </div>
            <span className="bg-gradient-to-r from-[var(--text-primary)] to-[var(--primary)] bg-clip-text text-transparent">
              {storeName}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-[var(--surface-muted)]/60 p-1.5 rounded-full border border-[var(--border)]">
            {STORE_NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200",
                    isActive
                      ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs mx-4">
            <SearchBar placeholder="Search products" suggestions />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            <Link href="/account" className="hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                aria-label="User Account"
                className="h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <User className="h-4 w-4" />
              </Button>
            </Link>

            {favoritesHref && <Link href={favoritesHref} className="hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                aria-label={favoriteCount === null ? "Favorites" : `Favorites (${favoriteCount})`}
                className="h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Heart className="h-4 w-4" />
                {favoriteCount !== null && favoriteCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">{favoriteCount}</span>}
              </Button>
            </Link>}

            {notificationSummary && <NotificationBell notifications={notificationSummary.notifications} unreadCount={notificationSummary.unreadCount} />}

            {/* Cart Trigger */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative h-9 px-3.5 gap-2 shadow-xs cursor-pointer"
              aria-label={`Open shopping cart with ${totalCartCount} items`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {totalCartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-[11px] font-bold">
                  {totalCartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        links={STORE_NAV_LINKS}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        currency={currency}
      />
    </>
  );
}
