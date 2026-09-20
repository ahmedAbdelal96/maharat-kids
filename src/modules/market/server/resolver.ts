import "server-only";

import { headers } from "next/headers";
import { env } from "@/config/env";
import { logger } from "@/server/logger";
import { getMarketConfiguration, marketFromCountryCode, type Market } from "../domain/market";

export type ResolvedMarket = Readonly<{ market: Market; source: "trusted-country-header" | "development-fallback"; configuration: ReturnType<typeof getMarketConfiguration> }>;

/**
 * Deployment adapters inject the country header. In production, absence or an
 * unsupported country fails closed instead of trusting locale/cookies/client input.
 */
export async function resolveMarket(): Promise<ResolvedMarket> {
  const headerName = env.MARKET_TRUSTED_COUNTRY_HEADER;
  let country: string | null = null;
  try {
    country = (await headers()).get(headerName);
  } catch (error) {
    // Node-based acceptance tests and local domain probes have no request scope;
    // development still uses the explicit configured fallback in that context.
    if (env.NODE_ENV === "production") throw error;
  }
  const market = marketFromCountryCode(country);
  if (market) return { market, source: "trusted-country-header", configuration: getMarketConfiguration(market) };
  if (env.NODE_ENV !== "production") {
    const fallback = env.MARKET_DEVELOPMENT_FALLBACK;
    return { market: fallback, source: "development-fallback", configuration: getMarketConfiguration(fallback) };
  }
  logger.warn("Market could not be resolved from trusted infrastructure", { headerName });
  throw new Error("MARKET_UNRESOLVED");
}
