import { appConfig } from "@/config/app.config";

import type { StoreSetting, StoreSettings } from "../types";

export const fallbackStoreSettings: StoreSettings = {
  name: appConfig.name,
  email: "",
  phone: "",
  currency: "SAR",
  language: appConfig.defaultLocale,
  seoTitle: appConfig.name,
  seoDescription: appConfig.description,
  googleEnabled: false,
  maxActiveOffers: 10,
  maxHeroOffers: 3,
  returnsEnabled: false,
  returnsWindowDays: 14,
  returnsPolicyText: "",
};

function stringValue(settings: Map<string, StoreSetting>, key: string, fallback: string): string {
  const value = settings.get(key)?.value;
  return typeof value === "string" ? value : fallback;
}

function booleanValue(settings: Map<string, StoreSetting>, key: string, fallback: boolean): boolean {
  const value = settings.get(key)?.value;
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(settings: Map<string, StoreSetting>, key: string, fallback: number): number {
  const value = settings.get(key)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toStoreSettings(records: readonly StoreSetting[]): StoreSettings {
  const settings = new Map(records.map((record) => [record.key, record]));

  return {
    name: stringValue(settings, "store.name", fallbackStoreSettings.name),
    email: stringValue(settings, "store.email", fallbackStoreSettings.email),
    phone: stringValue(settings, "store.phone", fallbackStoreSettings.phone),
    currency: stringValue(settings, "store.currency", fallbackStoreSettings.currency),
    language: stringValue(settings, "store.language", fallbackStoreSettings.language),
    seoTitle: stringValue(settings, "seo.title", fallbackStoreSettings.seoTitle),
    seoDescription: stringValue(settings, "seo.description", fallbackStoreSettings.seoDescription),
    googleEnabled: booleanValue(settings, "auth.google.enabled", false),
    maxActiveOffers: numberValue(settings, "promotions.maxActiveOffers", 10),
    maxHeroOffers: numberValue(settings, "promotions.maxHeroOffers", 3),
    returnsEnabled: booleanValue(settings, "returns.enabled", false),
    returnsWindowDays: numberValue(settings, "returns.windowDays", 14),
    returnsPolicyText: stringValue(settings, "returns.policyText", ""),
  };
}
