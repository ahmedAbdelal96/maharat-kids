"use client";

import { useTransition } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import {
  User,
  ShoppingBag,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Heart,
  UserPlus,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/search-bar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { NavLink, HeaderUserSummary } from "./store-header";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useTranslations } from "next-intl";
import { logout, logoutCurrentUser } from "@/modules/auth/server/actions";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
  user?: HeaderUserSummary | null;
  favoritesHref?: string | null;
}

export function MobileNav({
  isOpen,
  onClose,
  links,
  user = null,
  favoritesHref = "/account/favorites",
}: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const common = useTranslations("common.navigation");
  const [, startLogout] = useTransition();

  function handleLogout() {
    startLogout(async () => {
      const result = user?.sessionId
        ? await logout(user.sessionId)
        : await logoutCurrentUser();
      if (result.success) {
        onClose();
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

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      title={common("menu")}
      description={t("categories")}
    >
      <div className="flex flex-col h-full justify-between gap-6 pb-2">
        <div className="space-y-4">
          {/* User Profile Card or Auth Buttons */}
          {user ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] text-sm font-bold shadow-xs">
                  {userInitial}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {displayName}
                    </span>
                    {user.isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--primary)]">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="truncate text-xs text-[var(--text-muted)]">
                    {user.email}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={onClose} className="w-full">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center gap-2 h-10 text-xs font-semibold shadow-xs"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t("signIn")}</span>
                </Button>
              </Link>
              <Link href="/register" onClick={onClose} className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2 h-10 text-xs font-medium border-[var(--border)]"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t("register")}</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Search */}
          <div>
            <SearchBar
              placeholder={common("searchCatalog")}
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
                    "flex items-center justify-between rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/50 hover:text-[var(--text-primary)]",
                  )}
                >
                  <span>
                    {link.translationKey ? t(link.translationKey) : link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Utility Links & Theme Toggle */}
        <div className="border-t border-[var(--border)] pt-3 space-y-1">
          {user && (
            <>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <User className="h-4 w-4" />
                <span>{t("profile")}</span>
              </Link>

              <Link
                href="/account/orders"
                onClick={onClose}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Package className="h-4 w-4" />
                <span>{t("orders")}</span>
              </Link>

              <Link
                href={favoritesHref || "/account/favorites"}
                onClick={onClose}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Heart className="h-4 w-4" />
                <span>{t("favorites")}</span>
              </Link>

              {user.isAdmin && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-muted)] transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t("adminDashboard")}</span>
                </Link>
              )}
            </>
          )}

          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{common("myCart")}</span>
          </Link>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive-subtle)] transition-colors cursor-pointer text-start"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("signOut")}</span>
            </button>
          )}

          <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between px-4 py-1">
            <LocaleSwitcher />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {common("themePreference")}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
