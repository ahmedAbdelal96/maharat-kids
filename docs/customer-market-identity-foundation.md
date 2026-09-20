# MK-01 — Customer Market & Identity Foundation

## Pre-implementation impact map

| Concern | Existing implementation | MK-01 impact |
| --- | --- | --- |
| Market | No commercial market domain; locale is presentation-only | Add a server-resolved `Market` context. It must never be inferred from locale or trusted from browser input. |
| Catalog pricing | `Product.price` and `compareAtPrice` are global decimals | Introduce normalized per-market prices and route all customer price reads through one resolver. |
| Cart | Guest/customer cart is server-backed and token-hashed, but marketless | Attach market to cart; reprice and revalidate atomically when authoritative market changes. |
| Orders | Immutable commercial totals and order item prices; `currency` exists | Add market snapshot and ensure checkout receives authoritative market pricing. |
| Customer login | Email/password, registration, reset code, optional Google OAuth | Replace customer-facing paths with a single passwordless OTP flow. Keep staff/admin password sessions and RBAC. |
| Identity | Shared `User` requires unique email and password hash | Make customer email/password optional and add verified, normalized `CustomerIdentity` records. |
| Sessions | HTTP-only opaque cookie, SHA-256 token hash, DB validation | Reuse it and rotate/create a new session only after successful OTP verification. |
| Guest cart merge | Merge happens after password login/registration | Reuse merge only after OTP authentication, with market reconciliation first. |
| Discounts | Coupon/promotion engine calculates from cart money | Fixed monetary rules need explicit currency/market semantics before they can be safely enabled across markets. |

## Discovery findings

- `User`, `Session`, `OAuthAccount`, and `PasswordResetCode` are in `prisma/schema.prisma`; a customer and an administrator share `User` today.
- `CookieSessionManager` already uses opaque, hashed, HTTP-only sessions. This is retained; no JWT is introduced.
- Customer password actions and Google entry routes are confined to the store auth route group, while admin authorization is permission/RBAC based.
- Guest carts use an HTTP-only random token whose hash is persisted, and existing merge behavior is server-side.
- Current product repository, cart repository, promotion/coupon evaluators, checkout/order repository, product admin forms, and currency formatters all assume a single commercial price.

## Trust boundary

Market resolution will accept only deployment-injected, configured trusted country headers in production. Browser locale, form data, query strings, and the continuity cookie are never authoritative. Development/test uses an explicit deterministic fallback so local execution remains reproducible. The cookie is a navigation hint and is overwritten whenever the trusted resolver produces a result.

## Status

### Implemented foundation

- `src/modules/market/domain/market.ts` centralizes the only two commercial markets, their country, currency, and mandated customer identity channel.
- `src/modules/market/server/resolver.ts` resolves market on the server from a configurable trusted infrastructure header. It does not inspect locale, client payloads, or cookies. Local development uses a deterministic, explicit fallback; production fails closed without a supported trusted signal.

### Required next integration steps

The price/entity, cart/order, OTP identity, and route/UI migrations are not yet complete. They must land together with a generated Prisma migration and comprehensive regression tests; this isolated foundation deliberately does not claim end-to-end market pricing or passwordless authentication.

Address, carrier, payment, VAT, educational taxonomy, variants, CMS, analytics, and loyalty remain expressly deferred.
