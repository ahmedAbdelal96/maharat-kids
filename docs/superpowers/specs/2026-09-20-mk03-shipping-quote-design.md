# MK-03 Single-Carrier Shipping Quote Design

## Outcome

Checkout resolves one server-configured carrier and flat market rate after validating the trusted market and selected MK-02 address. The customer sees the carrier name, fee, and total; the customer never chooses a carrier or submits an authoritative fee.

## Architecture

- Reuse the existing `ShippingCompany` operational entity as the future carrier identity, adding stable code and Arabic/English display names.
- Add `ShippingCarrierMarketConfig` for one independent rate/configuration per carrier and market. A partial PostgreSQL unique index permits at most one checkout/default carrier per market while retaining additional disabled/future configurations.
- Add a small `resolveShippingQuote` provider boundary. `ConfiguredRateShippingProvider` reads the active market configuration, derives currency from `MARKET_CONFIGURATION`, accepts zero as free shipping, and fails closed when configuration is missing or ambiguous.
- Re-resolve the quote inside the existing order transaction, calculate `subtotal - discounts + shipping`, and snapshot carrier reference/code/display names, market, currency, amount, and source on `Order`.
- Extend the existing admin shipping page with carrier identity and Saudi/Egypt configuration editing. Customer checkout remains informational and has no carrier selector.

## Compatibility and exclusions

Existing `OrderShipment` operational workflows remain unchanged. Historical orders read their immutable order-level shipping snapshot, not current carrier settings. No live carrier API, booking, labels, tracking synchronization, payment gateway, or multi-carrier selection is added.

## Verification

Add database-backed MK-03 tests for resolution, market/currency isolation, zero/missing/ambiguous configuration, tamper resistance, order totals/snapshots, and historical immutability. Run MK-03, MK-02, MK-01, Prisma, TypeScript, lint, build, health, and responsive Arabic/English checkout acceptance checks.
