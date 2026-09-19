"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logout } from "@/modules/auth/server/actions";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useTranslations } from "next-intl";

export interface AdminHeaderProps {
  onToggleMobileSidebar: () => void;
  userName?: string;
  userRole?: string;
  sessionId: string;
}

export function AdminHeader({
  onToggleMobileSidebar,
  userName = "Admin User",
  userRole = "Store Owner",
  sessionId,
}: AdminHeaderProps) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [, startLogout] = useTransition();

  function handleLogout() {
    startLogout(async () => {
      const result = await logout(sessionId);

      if (result.success) {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  const userMenuItems = [
    {
      key: "profile",
      label: t("accountSettings"),
      onClick: () => {
        router.push("/admin/settings");
      },
    },
    {
      key: "live-store",
      label: t("publicStore"),
      onClick: () => {
        router.push("/");
      },
    },
    {
      key: "logout",
      label: t("logout"),
      destructive: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-card)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileSidebar}
          className="lg:hidden h-9 w-9"
          aria-label={t("console")}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Quick Search Mockup */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3.5 py-1.5 text-xs text-[var(--text-muted)] w-64 lg:w-80">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1">{t("search")}</span>
          <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-mono border border-[var(--border)]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LocaleSwitcher />
        <ThemeToggle />

        {/* Notifications Icon with indicator */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label={t("notifications")}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--destructive)] ring-2 ring-[var(--surface)]" />
        </Button>

        <div className="h-5 w-[1px] bg-[var(--border)] mx-1" />

        {/* User Profile Menu */}
        <Dropdown
          trigger={
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full p-1 hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
                {userName.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-start">
                <span className="text-xs font-semibold text-[var(--text-primary)] leading-none">
                  {userName}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 leading-none">
                  {userRole}
                </span>
              </div>
            </button>
          }
          items={userMenuItems}
          align="right"
        />
      </div>
    </header>
  );
}
