import type { ReactNode } from "react";
import { StoreHeader, type HeaderUserSummary } from "./store-header";
import { StoreFooter } from "./store-footer";
import { appConfig } from "@/config/app.config";
import { getStoreHeaderCart } from "@/modules/cart/server/queries";
import { getStorefrontFavoriteSummary } from "@/modules/favorites/server/queries";
import { getStorefrontNotificationSummary } from "@/modules/notifications/server/queries";
import { getCurrentUser } from "@/modules/auth/server/queries";
import { getTranslations } from "next-intl/server";

export interface StoreLayoutShellProps {
  children: ReactNode;
  storeName?: string;
  storeDescription?: string;
  currency?: string;
}

export async function StoreLayoutShell({
  children,
  storeName = appConfig.name,
  storeDescription = appConfig.description,
  currency = "SAR",
}: StoreLayoutShellProps) {
  const storefront = await getTranslations("storefront");
  const [cart, favorites, notifications, currentUserResult] = await Promise.all([
    getStoreHeaderCart(),
    getStorefrontFavoriteSummary(),
    getStorefrontNotificationSummary(),
    getCurrentUser(),
  ]);

  const user: HeaderUserSummary | null =
    currentUserResult?.success && currentUserResult.data
      ? {
          id: currentUserResult.data.user.id,
          name: currentUserResult.data.user.name,
          email: currentUserResult.data.user.email,
          type: currentUserResult.data.user.type,
          isAdmin:
            currentUserResult.data.user.type === "ADMIN" ||
            currentUserResult.data.roles.some((r) => r.name === "ADMIN"),
          sessionId: currentUserResult.data.session.id,
        }
      : null;

  const localizedDescription = storeDescription === appConfig.description ? storefront("catalogDescription") : storeDescription;
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)]">
      <StoreHeader
        storeName={storeName}
        cart={cart?.success ? cart.data : null}
        currency={currency}
        favoriteCount={favorites.count}
        favoritesHref={favorites.href}
        notificationSummary={notifications}
        user={user}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <StoreFooter storeName={storeName} description={localizedDescription} />
    </div>
  );
}
