"use client";

import { useState, useTransition } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import {
  ShoppingBag,
  Menu,
  Heart,
  User,
  LogIn,
  LogOut,
  Package,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { SearchBar } from "@/components/shared/search-bar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { CartDrawer } from "@/components/ecommerce/cart-drawer";
import type { Cart } from "@/modules/cart/types";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import type { StorefrontNotificationSummary } from "@/modules/notifications/types";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useTranslations } from "next-intl";
import { logout, logoutCurrentUser } from "@/modules/auth/server/actions";
import { BrandLockup } from "@/components/brand/brand-lockup";

export interface NavLink {
  label: string;
  href: string;
  translationKey?: "home" | "products" | "categories" | "offers";
}

export interface HeaderUserSummary {
  id: string;
  name: string | null;
  email: string | null;
  type: "CUSTOMER" | "ADMIN";
  isAdmin: boolean;
  sessionId?: string;
}

export const STORE_NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", translationKey: "home" },
  { label: "Products", href: "/products", translationKey: "products" },
  { label: "Categories", href: "/categories", translationKey: "categories" },
  { label: "Offers", href: "/offers", translationKey: "offers" },
];

export interface StoreHeaderProps {
  storeName?: string;
  announcement?: string;
  cart?: Cart | null;
  currency?: string;
  favoriteCount?: number | null;
  favoritesHref?: string | null;
  notificationSummary?: StorefrontNotificationSummary | null;
  user?: HeaderUserSummary | null;
}

export function StoreHeader({
  announcement,
  cart = null,
  currency = "SAR",
  favoriteCount = null,
  favoritesHref = "/account/favorites",
  notificationSummary = null,
  user = null,
}: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const common = useTranslations("common.navigation");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [, startLogout] = useTransition();

  const totalCartCount = cart?.itemCount ?? 0;

  function handleLogout() {
    startLogout(async () => {
      const result = user?.sessionId
        ? await logout(user.sessionId)
        : await logoutCurrentUser();
      if (result.success) {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0] || "User";
  const userInitial = (
    user?.name?.trim().charAt(0) ||
    user?.email?.charAt(0) ||
    "U"
  ).toUpperCase();

  const userMenuItems: DropdownItem[] = user
    ? [
        {
          key: "account",
          label: t("profile"),
          icon: <User className="h-4 w-4 text-[var(--text-secondary)]" />,
          onClick: () => {
            router.push("/account");
          },
        },
        {
          key: "orders",
          label: t("orders"),
          icon: <Package className="h-4 w-4 text-[var(--text-secondary)]" />,
          onClick: () => {
            router.push("/account/orders");
          },
        },
        {
          key: "favorites",
          label: t("favorites"),
          icon: <Heart className="h-4 w-4 text-[var(--text-secondary)]" />,
          onClick: () => {
            router.push(favoritesHref || "/account/favorites");
          },
        },
        ...(user.isAdmin
          ? [
              {
                key: "admin",
                label: t("adminDashboard"),
                icon: (
                  <LayoutDashboard className="h-4 w-4 text-[var(--primary)]" />
                ),
                onClick: () => {
                  router.push("/admin");
                },
              },
            ]
          : []),
        {
          key: "logout",
          label: t("signOut"),
          icon: <LogOut className="h-4 w-4" />,
          destructive: true,
          divider: true,
          onClick: handleLogout,
        },
      ]
    : [];

  const userMenuHeader = user ? (
    <div className="flex items-center gap-2.5 py-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-bold ring-2 ring-[var(--surface)] shadow-xs">
        {userInitial}
      </div>
      <div className="flex min-w-0 flex-1 flex-col text-start">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
            {displayName}
          </span>
          {user.isAdmin && (
            <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--primary)]">
              Admin
            </span>
          )}
        </div>
        <span className="truncate text-[11px] text-[var(--text-muted)]">
          {user.email ?? ""}
        </span>
      </div>
    </div>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md transition-all shadow-xs">
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
              aria-label={common("openMenu")}
              className="h-10 w-10 text-[var(--text-primary)]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Logo / Brand Name */}
          <Link href="/" className="transition-opacity hover:opacity-85 inline-flex items-center shrink-0" aria-label="Maharat Kids home">
            <BrandLockup variant="header" priority />
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
                  {link.translationKey ? t(link.translationKey) : link.label}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs mx-4">
            <SearchBar placeholder={common("searchCatalog")} suggestions />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />

            {/* User Account / Sign-In Button */}
            {user ? (
              <Dropdown
                trigger={
                  <button
                    type="button"
                    className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/50 py-1 pe-2.5 ps-1 hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    aria-label={common("userAccount")}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-bold shadow-xs">
                      {userInitial}
                    </div>
                    <span className="max-w-[90px] truncate text-xs font-medium text-[var(--text-primary)]">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
                  </button>
                }
                header={userMenuHeader}
                items={userMenuItems}
                align="right"
                className="w-56"
              />
            ) : (
              <Link href="/login" className="hidden sm:inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 gap-2 rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)] transition-all font-medium text-xs shadow-xs"
                >
                  <LogIn className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                  <span>{t("signIn")}</span>
                </Button>
              </Link>
            )}

            {favoritesHref && (
              <Link href={favoritesHref} className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    favoriteCount === null
                      ? common("favorites")
                      : `${common("favorites")} (${favoriteCount})`
                  }
                  className="h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Heart className="h-4 w-4" />
                  {favoriteCount !== null && favoriteCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">
                      {favoriteCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {notificationSummary && (
              <NotificationBell
                notifications={notificationSummary.notifications}
                unreadCount={notificationSummary.unreadCount}
              />
            )}

            {/* Cart Trigger */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative h-9 px-3.5 gap-2 shadow-xs cursor-pointer"
              aria-label={common("openCart", { count: totalCartCount })}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-semibold">
                {t("cart")}
              </span>
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
        user={user}
        favoritesHref={favoritesHref}
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
