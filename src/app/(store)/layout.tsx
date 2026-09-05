import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StoreLayoutShell } from "@/components/layout/store-layout-shell";
import { appConfig } from "@/config/app.config";
import { fallbackStoreSettings } from "@/modules/store/domain/configuration";
import { getPublicStoreSettings } from "@/modules/store/server/queries";

// The store shell reads request-scoped session and guest-cart cookies.
export const dynamic = "force-dynamic";

async function loadStoreSettings() {
  const result = await getPublicStoreSettings();
  return result.success ? result.data : fallbackStoreSettings;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadStoreSettings();

  return {
    title: settings.seoTitle || settings.name,
    description: settings.seoDescription || appConfig.description,
  };
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const settings = await loadStoreSettings();

  return (
    <StoreLayoutShell
      storeName={settings.name}
      storeDescription={settings.seoDescription || appConfig.description}
      currency={settings.currency}
    >
      {children}
    </StoreLayoutShell>
  );
}
