import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveMarketFromSignals } from "../src/modules/market/server/resolver";

const base = {
  developmentMarket: "SAUDI_ARABIA" as const,
  trustedProxySecret: "proxy-secret-that-is-long-enough-123456",
};

test("trusted Egypt and Saudi country signals resolve independent markets", () => {
  assert.equal(resolveMarketFromSignals({ ...base, nodeEnv: "production", countryCode: " eg " , suppliedProxySecret: base.trustedProxySecret }).market, "EGYPT");
  assert.equal(resolveMarketFromSignals({ ...base, nodeEnv: "production", countryCode: "SA", suppliedProxySecret: base.trustedProxySecret }).market, "SAUDI_ARABIA");
});

test("production rejects missing, unsupported, and untrusted market signals", () => {
  assert.throws(() => resolveMarketFromSignals({ ...base, nodeEnv: "production", countryCode: "EG", suppliedProxySecret: "wrong" }), /MARKET_TRUST_UNVERIFIED/);
  assert.throws(() => resolveMarketFromSignals({ ...base, nodeEnv: "production", countryCode: "US", suppliedProxySecret: base.trustedProxySecret }), /MARKET_UNRESOLVED/);
  assert.throws(() => resolveMarketFromSignals({ ...base, nodeEnv: "production", countryCode: null, suppliedProxySecret: base.trustedProxySecret }), /MARKET_UNRESOLVED/);
});

test("development fallback is explicit and never controls production", () => {
  assert.equal(resolveMarketFromSignals({ ...base, nodeEnv: "development", countryCode: null }).market, "SAUDI_ARABIA");
  assert.equal(resolveMarketFromSignals({ ...base, nodeEnv: "development", developmentMarket: "EGYPT", countryCode: null }).market, "EGYPT");
  assert.throws(() => resolveMarketFromSignals({ ...base, nodeEnv: "production", developmentMarket: "EGYPT", countryCode: null, suppliedProxySecret: base.trustedProxySecret }), /MARKET_UNRESOLVED/);
});

test("storefront price components do not carry an independent SAR market default", () => {
  const files = [
    "src/components/ecommerce/product-card.tsx",
    "src/components/ecommerce/product-grid.tsx",
    "src/components/ecommerce/price-display.tsx",
    "src/components/ecommerce/quick-view-modal.tsx",
    "src/components/ecommerce/cart-drawer.tsx",
    "src/components/layout/store-header.tsx",
    "src/components/layout/store-layout-shell.tsx",
  ];
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /currency\s*=\s*["']SAR["']/);
});

test("market-sensitive routes stay request-dynamic and locale does not select a market", () => {
  for (const file of [
    "src/app/[locale]/(store)/layout.tsx",
    "src/app/[locale]/(store)/page.tsx",
    "src/app/[locale]/(store)/products/page.tsx",
    "src/app/[locale]/(store)/products/[slug]/page.tsx",
    "src/app/[locale]/(store)/cart/page.tsx",
    "src/app/[locale]/(store)/checkout/page.tsx",
  ]) {
    assert.match(readFileSync(file, "utf8"), /export const dynamic = ["']force-dynamic["']/);
  }
  const header = readFileSync("src/components/layout/store-header.tsx", "utf8");
  assert.doesNotMatch(header, /market|currency.*select|SAUDI_ARABIA|EGYPT/i);
});
