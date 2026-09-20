# MK-02 Market-Aware Customer Addresses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `CustomerAddress` domain into a market-owned, structured Saudi/Egypt address system with a safe development SPL provider, checkout enforcement, immutable order snapshots, and responsive customer UX.

**Architecture:** Keep one shared `CustomerAddress` model and repository. Derive market only from `resolveMarket()` in server services; never accept browser market/country as authority. Put Saudi National Address resolution behind an `AddressResolutionProvider` interface with a deterministic development provider and a production adapter that fails closed until documented SPL credentials/configuration exist. Reuse the existing JSON order snapshot rather than adding a redundant snapshot table.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, TypeScript, Zod, server actions, next-intl, Playwright, Node test runner.

**Spec:** `C:/Users/IT/.codex/attachments/18a65392-cca6-49da-b4e1-6ad6bd9f4d36/pasted-text.txt`

## Global Constraints

- Preserve all frozen MK-01 market, pricing, OTP, cart, auth, and cache semantics.
- Market is derived only by the trusted server resolver; locale is presentation only.
- Saudi uses structured addresses and SPL as the preferred verified path; Egypt never shows or calls SPL.
- Customer authentication OTP and address-resolution challenges are separate records and flows.
- Do not invent undocumented SPL endpoints, payloads, authentication, or OTP behavior.
- Do not add shipping-carrier, shipping-price, payment-gateway, VAT/ZATCA, or MK-03 scope.
- Production without valid SPL configuration must fail closed; the development provider must never activate in production.
- Preserve legacy addresses as `MANUAL`/`UNVERIFIED`; never infer historical SPL verification.
- Use official brand strings `مهارة طفل` and `Maharat Kids`; never add `مهارات طفل`.

## Review Focus

- A browser-submitted address ID from the other market must be rejected server-side at checkout; test the repository/service boundary.
- A customer must not read or mutate another customer’s address; test all CRUD paths with two users.
- Default changes must leave exactly one default per customer and market; test Saudi and Egypt independently.
- Editing SPL core location data must invalidate verification while editing delivery-only fields may preserve it; test both paths.
- Provider challenges must be customer-owned, expiring, replay-safe, rate-limited, and OTP-free in logs; test expiry, replay, wrong owner, and production fail-closed behavior.

---

### Task 1: Lock the current address/order behavior with failing tests

**Files:**
- Create: `tests/mk02-addresses.test.ts`
- Modify: `tests/tsconfig.acceptance.json` only if the new test needs an alias already absent.

- [ ] **Step 1: Write failing tests** for market-aware address creation, ownership rejection, per-market defaults, provider boundary, cross-market checkout rejection, and order snapshot immutability using disposable Prisma users and addresses.
- [ ] **Step 2: Run** `node --env-file=.env node_modules/tsx/dist/cli.cjs --tsconfig tests/tsconfig.acceptance.json --test tests/mk02-addresses.test.ts`; confirm failures are missing fields/behavior, not test setup errors.
- [ ] **Step 3: Keep these tests as the executable contract** for each subsequent task; do not weaken assertions to match implementation.

### Task 2: Add the shared market-aware address schema and migration

**Files:**
- Modify: `prisma/schema.prisma` (`CustomerAddress`, supporting enums/models).
- Create: `prisma/migrations/<timestamp>_mk02_market_aware_addresses/migration.sql`.
- Modify: `src/modules/customers/types.ts`, `src/modules/customers/schema.ts`, `src/modules/customers/address.ts`.
- Test: `tests/mk02-addresses.test.ts` schema/default assertions.

- [ ] **Step 1: Add enums/fields** using repository conventions: `AddressSource` (`MANUAL`, `SPL`), `AddressVerification` (`UNVERIFIED`, `VERIFIED`), `market`, `countryCode`, recipient fields, Saudi structured fields (`region`, `district`, `buildingNumber`, `additionalNumber`, `shortAddress`, `unitNumber`, `latitude`, `longitude`), Egypt/manual fields (`governorate`, `city`, `area`, `street`, `building`, `floor`, `apartment`, `postalCode`), notes, provenance/session metadata, and timestamps.
- [ ] **Step 2: Preserve existing rows** by backfilling `market=EGYPT`, `countryCode=EG`, `source=MANUAL`, `verification=UNVERIFIED` only where no defensible market signal exists; retain all legacy text fields.
- [ ] **Step 3: Add indexes** for `(userId, market, isDefault)`, `(market, verification)`, and provider reference/session lookup where applicable.
- [ ] **Step 4: Run** `npx prisma migrate dev`/the repository migration command against the disposable database and `npx prisma generate`.
- [ ] **Step 5: Run the Task 1 schema tests** and confirm legacy rows remain usable and unverified.

### Task 3: Implement ownership, market, normalization, and default semantics

**Files:**
- Modify: `src/modules/customers/infrastructure/repository.ts`.
- Modify: `src/modules/customers/domain/service.ts`.
- Modify: `src/modules/customers/server/actions.ts`.
- Modify: `src/modules/customers/server/queries.ts`.
- Modify: `src/modules/market/server/resolver.ts` only if a server-context helper is required.
- Test: `tests/mk02-addresses.test.ts` CRUD, ownership, defaults, normalization.

- [ ] **Step 1: Derive market in server service methods** with `resolveMarket()` and map `SA`/`EG` country codes; ignore or reject client market/country values.
- [ ] **Step 2: Enforce authenticated customer ownership** in every read/update/delete/default operation by querying `{ id, userId }`; never use a submitted `userId`.
- [ ] **Step 3: Make defaults market-scoped**: in one transaction clear defaults only for the actor and active market, then set the chosen address; creation makes the first address for that market default and never changes the other market’s default.
- [ ] **Step 4: Normalize recipient phones** with existing Saudi normalization and a validated Egypt canonical representation without treating shipping phone as an auth identity.
- [ ] **Step 5: Add verification-preserving edit rules**: delivery-only changes retain SPL verification; provider-authoritative field changes set source/verification to `MANUAL`/`UNVERIFIED` or require re-resolution.
- [ ] **Step 6: Run targeted tests**, then the full existing MK-01 suite.

### Task 4: Add the SPL provider boundary and development provider

**Files:**
- Create: `src/modules/addresses/providers/types.ts`.
- Create: `src/modules/addresses/providers/development-provider.ts`.
- Create: `src/modules/addresses/providers/spl-provider.ts`.
- Create: `src/modules/addresses/domain/resolution-service.ts`.
- Create: `src/modules/addresses/server/actions.ts` and `src/modules/addresses/server/queries.ts`.
- Modify: `src/config/env.ts` for server-only SPL configuration names (never `NEXT_PUBLIC_*`).
- Create: Prisma resolution-session model/migration if the provider flow requires persisted challenges.
- Test: `tests/mk02-addresses.test.ts` provider lifecycle.

- [ ] **Step 1: Define DTOs** for request, consent, challenge, candidate address, selected address, and provider failure without copying undocumented external payloads into the domain.
- [ ] **Step 2: Implement deterministic development provider** for non-production only: request by normalized Saudi recipient phone, return a challenge reference and fixed test code from test configuration, verify expiry/replay/ownership, return one or more fixture addresses, and never log the code.
- [ ] **Step 3: Implement production adapter boundary** using only the official National Address API documentation: documented address search/verification capabilities are the contract; credentials, subscription, endpoint/API-key configuration remain server-only. If configuration is absent or the required consent flow is unavailable, return a generic provider-unavailable failure.
- [ ] **Step 4: Ensure `NODE_ENV=production` cannot use the development provider** and provider failures never revoke or mutate the customer auth session.
- [ ] **Step 5: Run provider tests** for multiple results, explicit selection, wrong customer, expiry, replay, rate limit, and production fail-closed behavior.

### Task 5: Integrate customer account address UX

**Files:**
- Modify: `src/modules/customers/components/customer-account-content.tsx` or extract focused address components if the existing file becomes unsafe to edit.
- Create/modify: `src/modules/addresses/components/address-form.tsx`, `address-card.tsx`, `saudi-resolution-flow.tsx`, `egypt-manual-form.tsx`.
- Modify: `src/app/[locale]/(store)/account/addresses/page.tsx` and account data queries.
- Modify: `messages/ar/*` and `messages/en/*` for customer-facing labels/errors.
- Test: Playwright MK-02 browser spec at desktop and 390px.

- [ ] **Step 1: Add Saudi market UI** with structured fields, a clear National Address action, consent, challenge/verification states, multiple-result selection, verified provenance, and generic recoverable errors.
- [ ] **Step 2: Add Egypt market UI** with manual governorate/city/area/street/building/floor/apartment/landmark/postal fields and no SPL/National Address copy or requests.
- [ ] **Step 3: Add cards** that show market, recipient, concise delivery location, default state, and verified/manual status; keep provider IDs and sensitive metadata hidden.
- [ ] **Step 4: Verify Arabic RTL and English LTR** with the Taste Skill, preserving existing components/tokens and avoiding new dependencies.
- [ ] **Step 5: Run browser tests** with trusted SA/EG headers at desktop and 390px, including locale switches that do not alter market behavior.

### Task 6: Enforce market-safe checkout and order snapshots

**Files:**
- Modify: `src/modules/orders/server/queries.ts`, `src/modules/orders/server/actions.ts`.
- Modify: `src/modules/orders/domain/service.ts` and `src/modules/orders/infrastructure/repository.ts`.
- Modify: `src/modules/orders/types.ts` and `src/modules/orders/components/checkout-client.tsx`.
- Modify: `src/app/[locale]/(store)/checkout/page.tsx` only for address UX/navigation.
- Test: `tests/mk02-addresses.test.ts` and Playwright checkout scenarios.

- [ ] **Step 1: Resolve active market on every checkout read and order write**; return only addresses owned by the customer and matching that market.
- [ ] **Step 2: Reject a crafted cross-market address ID server-side** before payment/order mutation; invalidate stale selection after market changes and require a current-market address.
- [ ] **Step 3: Extend the existing JSON snapshot** with market/country, recipient, phone, all structured fields, source, verification, and delivery instructions; validate required fields before order creation.
- [ ] **Step 4: Prove immutability** by editing/deleting the saved address after order creation and asserting the order JSON remains unchanged.
- [ ] **Step 5: Keep shipping carrier and payment behavior untouched** outside address validation/snapshot requirements.

### Task 7: Regression, runtime acceptance, and documentation

**Files:**
- Modify: `tests/mk01-acceptance.test.ts` only if a regression assertion is needed.
- Create: `e2e-tests/mk02-addresses.spec.ts`.
- Create: `docs/mk02-address-provider.md` documenting official SPL references, configuration prerequisites, test provider behavior, and fail-closed production behavior.

- [ ] **Step 1: Run** `npm run test:mk01` and the complete MK-02 Node test command; record exact totals.
- [ ] **Step 2: Run** Playwright Saudi/Egypt account, provider, checkout, cross-market, locale, desktop, and 390px scenarios.
- [ ] **Step 3: Run** `npm exec -- prisma validate`, `npm exec -- prisma migrate status`, `npm exec -- tsc --noEmit`, `npm run lint`, and `npm run build`.
- [ ] **Step 4: Start the dev server and verify** `/api/health` returns 200.
- [ ] **Step 5: Audit source for `مهارات طفل`, browser-exposed SPL secrets, provider OTP logging, and out-of-scope shipping/payment changes.
- [ ] **Step 6: Perform a final self-review against every spec phase and report `MK-02 IMPLEMENTED / VERIFIED / CLOSED` only when all gates pass.
