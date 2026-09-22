"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Boxes,
  Settings,
  CreditCard,
  ShieldCheck,
  Store,
  Truck,
  Tag,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Star,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { BrandLockup } from "@/components/brand/brand-lockup";

export interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  permissions?: string[];
  className?: string;
}

type AdminNavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
};

type AdminNavEntry = AdminNavItem | { name: string; items: AdminNavItem[] };

export const ADMIN_SIDEBAR_NAV: AdminNavEntry[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    name: "Catalog",
    items: [
      {
        name: "Products",
        href: "/admin/products",
        icon: Package,
        permission: "products.view",
      },
      {
        name: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
        permission: "categories.view",
      },
      {
        name: "Educational Taxonomies",
        href: "/admin/catalog",
        icon: FolderTree,
        permission: "catalog.taxonomy.manage",
      },
      {
        name: "Promotions",
        href: "/admin/promotions",
        icon: Tag,
        permission: "promotions.view",
      },
      {
        name: "Coupons",
        href: "/admin/coupons",
        icon: Tag,
        permission: "coupons.view",
      },
    ],
  },
  {
    name: "Content",
    items: [
      { name: "Blog", href: "/admin/blog", icon: BookOpen, permission: "blog.view" },
      { name: "Blog Categories", href: "/admin/blog/categories", icon: FolderTree, permission: "blog.categories" },
    ],
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    permission: "orders.view",
  },
  {
    name: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
    permission: "payments.view",
  },
  {
    name: "Returns",
    href: "/admin/returns",
    icon: RotateCcw,
    permission: "returns.view",
  },
  {
    name: "Shipping",
    href: "/admin/shipping",
    icon: Truck,
    permission: "shipping.view",
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
    permission: "customers.view",
  },
  {
    name: "Reviews",
    href: "/admin/reviews",
    icon: Star,
    permission: "reviews.view",
  },
  {
    name: "Inventory",
    href: "/admin/inventory",
    icon: Boxes,
    permission: "inventory.view",
  },
  {
    name: "Admin Users",
    href: "/admin/users",
    icon: ShieldCheck,
    permission: "users.view",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "settings.view",
  },
  {
    name: "Activity Log",
    href: "/admin/audit-log",
    icon: ClipboardList,
    permission: "audit.view",
  },
];

const adminLabelKeys: Record<string, string> = {
  Dashboard: "dashboard",
  Catalog: "catalog",
  Products: "products",
  Categories: "categories",
  "Educational Taxonomies": "educationalTaxonomies",
  Promotions: "promotions",
  Coupons: "coupons",
  Orders: "orders",
  Payments: "payments",
  Returns: "returns",
  Shipping: "shipping",
  Customers: "customers",
  Reviews: "reviews",
  Inventory: "inventory",
  "Admin Users": "users",
  Settings: "settings",
  "Activity Log": "auditLog",
  Blog: "blog",
  "Blog Categories": "blogCategories",
};

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  permissions = [],
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  function renderNavItem(item: AdminNavItem) {
    if (item.permission && !permissions.includes(item.permission)) return null;
    const Icon = item.icon;
    const label = item.name === "Educational Taxonomies" ? "Educational taxonomies" : item.name === "Blog" ? "Blog" : item.name === "Blog Categories" ? "Blog categories" : t(adminLabelKeys[item.name] ?? "dashboard");
    const isActive =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors select-none",
          isActive
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
          isCollapsed && "justify-center px-0"
        )}
        title={isCollapsed ? label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-e border-[var(--border)] bg-[var(--surface-card)] transition-all duration-300 z-30",
        isCollapsed ? "w-18" : "w-64",
        className
      )}
    >
      {/* Header / Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--border)]">
        <Link
          href="/admin"
          className="flex items-center gap-3 overflow-hidden"
        >
          <BrandLockup variant="admin" compact={isCollapsed} />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-[var(--text-primary)] leading-none">
                {t("console")}
              </span>
              <span className="text-[11px] text-[var(--brand-green)] mt-1 truncate">
                مهارة طفل
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label={isCollapsed ? t("expand") : t("collapse")}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {ADMIN_SIDEBAR_NAV.map((entry) =>
          "items" in entry ? (
            <div key={entry.name} className="space-y-1.5 pt-2 first:pt-0">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {entry.name === "Content" ? "Content" : t(adminLabelKeys[entry.name] ?? "catalog")}
                </p>
              )}
              <div className="space-y-1.5">{entry.items.map(renderNavItem)}</div>
            </div>
          ) : (
            renderNavItem(entry)
          )
        )}
      </nav>

      {/* Footer / Return to Store */}
      <div className="p-3 border-t border-[var(--border)]">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? t("viewStore") : undefined}
        >
          <Store className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>{t("viewStore")}</span>}
        </Link>
      </div>
    </aside>
  );
}
