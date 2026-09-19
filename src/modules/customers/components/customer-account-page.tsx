import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CustomerAccountActions } from "@/modules/auth/components/customer-account-actions";
import { loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { requireCustomer } from "@/modules/auth/server/queries";
import { getCustomerAccountData } from "@/modules/customers/server/queries";
import { getCustomerOrders } from "@/modules/orders/server/queries";
import { getCustomerFavorites } from "@/modules/favorites/server/queries";
import { getCustomerNotifications } from "@/modules/notifications/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCustomerReviews } from "@/modules/reviews/server/queries";
import { getTranslations } from "next-intl/server";

import { CustomerAccountContent, type AccountSection } from "./customer-account-content";

export async function CustomerAccountPage({ initialSection = "profile" }: { initialSection?: AccountSection }) {
  const result = await requireCustomer();
  const t = await getTranslations("account");

  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect(loginPathForReturnTo(initialSection === "notifications" ? "/account/notifications" : "/account"));
    if (result.error.code === "FORBIDDEN") redirect("/admin");
    throw result.error;
  }

  const [account, orders, favorites, notifications, settings, reviews] = await Promise.all([getCustomerAccountData(), getCustomerOrders(), getCustomerFavorites(), getCustomerNotifications({ page: 1, pageSize: 20 }), getPublicStoreSettings(), getCustomerReviews()]);
  if (!account.success) throw account.error;
  if (!orders.success) throw orders.error;
  if (!favorites.success) throw favorites.error;
  if (!notifications.success) throw notifications.error;
  if (!settings.success) throw settings.error;
  if (!reviews.success) throw reviews.error;

  const { user } = result.data;
  const { profile } = account.data;
  const displayName = profile.name || profile.email.split("@")[0] || "Customer";

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-base font-extrabold text-[var(--primary-foreground)]">{displayName.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">{t("title")}</h1><Badge variant="secondary" size="sm" className="font-semibold text-[10px]">{user.status}</Badge></div>
            <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{displayName} · {profile.email}</p>
          </div>
        </div>
        <CustomerAccountActions sessionId={result.data.session.id} />
      </header>

      <CustomerAccountContent initialData={{ ...account.data, orders: orders.data, favorites: favorites.data, notifications: notifications.data.items, unreadNotificationCount: notifications.data.unreadCount, reviewData: reviews.data }} currency={settings.data.currency} initialSection={initialSection} />
    </div>
  );
}
