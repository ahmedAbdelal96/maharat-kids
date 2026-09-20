import "server-only";

/** Commercial market; intentionally independent from the presentation locale. */
export const MARKETS = ["SAUDI_ARABIA", "EGYPT"] as const;
export type Market = (typeof MARKETS)[number];
export type CustomerIdentityChannel = "PHONE" | "EMAIL";

export type MarketConfiguration = Readonly<{
  market: Market;
  countryCode: "SA" | "EG";
  currency: "SAR" | "EGP";
  customerIdentityChannel: CustomerIdentityChannel;
  enabled: boolean;
}>;

export const MARKET_CONFIGURATION: Record<Market, MarketConfiguration> = {
  SAUDI_ARABIA: { market: "SAUDI_ARABIA", countryCode: "SA", currency: "SAR", customerIdentityChannel: "PHONE", enabled: true },
  EGYPT: { market: "EGYPT", countryCode: "EG", currency: "EGP", customerIdentityChannel: "EMAIL", enabled: true },
};

export function marketFromCountryCode(countryCode: string | null | undefined): Market | null {
  switch (countryCode?.trim().toUpperCase()) {
    case "SA": return "SAUDI_ARABIA";
    case "EG": return "EGYPT";
    default: return null;
  }
}

export function getMarketConfiguration(market: Market): MarketConfiguration {
  return MARKET_CONFIGURATION[market];
}
