import "server-only";

import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/config/env";
import { logger } from "@/server/logger";
import { getMarketConfiguration, marketFromCountryCode, type Market } from "../domain/market";

export type ResolvedMarket = Readonly<{ market: Market; source: "trusted-country-header" | "development-fallback"; configuration: ReturnType<typeof getMarketConfiguration> }>;

export type MarketGeoProvider = "vercel" | "trusted_proxy";

export type MarketSignalInput = Readonly<{
  nodeEnv: "development" | "test" | "production";
  geoProvider: MarketGeoProvider;
  countryCode: string | null | undefined;
  developmentMarket: Market;
  trustedProxySecret?: string;
  suppliedProxySecret?: string;
  e2eTestMode?: boolean;
}>;

function matchesSecret(expected: string | undefined, supplied: string | undefined): boolean {
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

/**
 * Resolve a market from infrastructure signals without consulting locale or
 * client state. This pure boundary is shared by the request resolver and
 * acceptance tests so unsupported production traffic cannot acquire a default.
 */
export function resolveMarketFromSignals(input: MarketSignalInput): { market: Market; source: ResolvedMarket["source"] } {
  const requiresTrustedProxy = input.nodeEnv === "production" && input.geoProvider === "trusted_proxy" && !input.e2eTestMode;
  if (requiresTrustedProxy && !matchesSecret(input.trustedProxySecret, input.suppliedProxySecret)) {
    throw new Error("MARKET_TRUST_UNVERIFIED");
  }

  const market = marketFromCountryCode(input.countryCode);
  if (market) return { market, source: "trusted-country-header" };
  if (input.nodeEnv !== "production") return { market: input.developmentMarket, source: "development-fallback" };
  throw new Error("MARKET_UNRESOLVED");
}

/**
 * Deployment adapters inject the country header. In production, absence or an
 * unsupported country fails closed instead of trusting locale/cookies/client input.
 */
export async function resolveMarket(): Promise<ResolvedMarket> {
  const headerName = env.MARKET_TRUSTED_COUNTRY_HEADER;
  let country: string | null = null;
  let suppliedSecret: string | undefined;
  try {
    const requestHeaders = await headers();
    country = requestHeaders.get(headerName);
    suppliedSecret = requestHeaders.get(env.MARKET_TRUSTED_PROXY_HEADER) ?? undefined;
  } catch (error) {
    // Node-based acceptance tests and local domain probes have no request scope;
    // development still uses the explicit configured fallback in that context.
    if (env.NODE_ENV === "production") throw error;
  }
  try {
    const resolved = resolveMarketFromSignals({
      nodeEnv: env.NODE_ENV,
      geoProvider: env.MARKET_GEO_PROVIDER,
      countryCode: country,
      developmentMarket: env.MARKET_DEVELOPMENT_FALLBACK,
      trustedProxySecret: env.MARKET_TRUSTED_PROXY_SECRET,
      suppliedProxySecret: suppliedSecret,
      e2eTestMode: process.env.MK_E2E_TEST_MODE === "1",
    });
    return { ...resolved, configuration: getMarketConfiguration(resolved.market) };
  } catch (error) {
    if (error instanceof Error && error.message === "MARKET_TRUST_UNVERIFIED") {
      logger.warn("Market request did not pass the trusted proxy boundary", { headerName });
    } else {
      logger.warn("Market could not be resolved from trusted infrastructure", { headerName });
    }
    throw error;
  }
}
