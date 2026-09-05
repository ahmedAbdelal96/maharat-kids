export const ADMIN_PERMISSIONS = {
  access: "admin.access",
  dashboardView: "dashboard.view",
} as const;

export const adminNavigation = [
  { key: "dashboard", href: "/admin", permission: "dashboard.view" },
  { key: "products", href: "/admin/products", permission: "products.view" },
  { key: "orders", href: "/admin/orders", permission: "orders.view" },
  { key: "returns", href: "/admin/returns", permission: "returns.view" },
  { key: "payments", href: "/admin/payments", permission: "payments.view" },
  { key: "coupons", href: "/admin/coupons", permission: "coupons.view" },
  { key: "reviews", href: "/admin/reviews", permission: "reviews.view" },
  { key: "customers", href: "/admin/customers", permission: "customers.view" },
  { key: "inventory", href: "/admin/inventory", permission: "inventory.view" },
  { key: "shipping", href: "/admin/shipping", permission: "shipping.view" },
  { key: "settings", href: "/admin/settings", permission: "settings.view" },
  { key: "audit-log", href: "/admin/audit-log", permission: "audit.view" },
  { key: "users", href: "/admin/users", permission: "users.view" },
] as const;
