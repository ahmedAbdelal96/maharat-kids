import type { ReactNode } from "react";
import { StoreHeader } from "./store-header";
import { StoreFooter } from "./store-footer";
import { appConfig } from "@/config/app.config";
import { getStoreHeaderCart } from "@/modules/cart/server/queries";
import { getStorefrontFavoriteSummary } from "@/modules/favorites/server/queries";
import { getStorefrontNotificationSummary } from "@/modules/notifications/server/queries";

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
  currency = "USD",
}: StoreLayoutShellProps) {
  const [cart, favorites, notifications] = await Promise.all([getStoreHeaderCart(), getStorefrontFavoriteSummary(), getStorefrontNotificationSummary()]);
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)]">
      <StoreHeader storeName={storeName} cart={cart?.success ? cart.data : null} currency={currency} favoriteCount={favorites.count} favoritesHref={favorites.href} notificationSummary={notifications} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <StoreFooter storeName={storeName} description={storeDescription} />
    </div>
  );
}
