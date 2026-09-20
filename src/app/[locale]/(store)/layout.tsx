import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StoreLayoutShell } from "@/components/layout/store-layout-shell";
import { appConfig } from "@/config/app.config";
import { fallbackStoreSettings } from "@/modules/store/domain/configuration";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { resolveMarket } from "@/modules/market/server/resolver";

// The store shell reads request-scoped session and guest-cart cookies.
export const dynamic = "force-dynamic";

async function loadStoreSettings() {
  const result = await getPublicStoreSettings();
  return result.success ? result.data : fallbackStoreSettings;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadStoreSettings();
  return {
    title: {
      default: settings.seoTitle || `${settings.name} | مهارة طفل`,
      template: `%s | ${settings.name}`,
    },
    description: settings.seoDescription || appConfig.description,
  };
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [settings, market] = await Promise.all([loadStoreSettings(), resolveMarket()]);

  return (
    <StoreLayoutShell
      storeName={settings.name}
      storeDescription={settings.seoDescription || appConfig.description}
      currency={market.configuration.currency}
    >
      {children}
    </StoreLayoutShell>
  );
}
