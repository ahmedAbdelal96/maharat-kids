# MK-03 Shipping Quote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a server-authoritative, market-aware single-carrier shipping quote with admin-configured Saudi/Egypt rates and immutable order snapshots.

**Architecture:** Extend the existing shipping-company operational model into a future-ready carrier identity, add per-market configuration with a database-backed single-default invariant, and route checkout/order pricing through a configured-rate provider. Keep existing shipment operations and MK-01/MK-02 address semantics intact.

**Tech Stack:** Next.js 16, React 19, Prisma 6/PostgreSQL, Zod, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-mk03-shipping-quote-design.md`

## Global Constraints

- Trusted server market is the only market authority.
- Saudi Arabia always uses SAR; Egypt always uses EGP; no FX conversion.
- Shipping price is admin-configured flat money and zero is valid free shipping.
- Missing/ambiguous configuration fails closed; no hardcoded zero fallback.
- Checkout has no customer-facing carrier selector.
- Existing MK-01/MK-02 semantics and operational shipment workflows remain frozen.

## Review Focus

- Concurrent/default carrier ambiguity — partial unique index plus transactional admin update and resolver rejection.
- Disabled/missing/zero rates — explicit resolver tests.
- Client carrier/price/currency tampering — order transaction ignores client values.
- Market/address changes — server market and MK-02 ownership/market filter are rechecked at placement.
- Historical carrier/rate renames — order-level snapshot tests.

### Task 1: Carrier schema and quote provider

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/modules/shipping/domain/quote.ts`
- Create: `src/modules/shipping/infrastructure/quote-repository.ts`
- Create: `tests/mk03-shipping.test.ts`
- Create: `prisma/migrations/<generated>_mk03_shipping_quotes/migration.sql`

- [ ] Write database-backed failing tests for Saudi/Egypt resolution, independent rates, different carriers, zero/free shipping, missing/disabled/ambiguous configuration, market-derived currency, and tamper-resistant quote inputs.
- [ ] Run `node --env-file=.env node_modules/tsx/dist/cli.cjs --test tests/mk03-shipping.test.ts`; confirm failure because models/provider are absent.
- [ ] Add carrier identity fields, market configuration model, rate-source enum, order snapshot fields, and the partial default index migration.
- [ ] Implement `ConfiguredRateShippingProvider` and `resolveShippingQuote` with Decimal-safe amounts and fail-closed errors.
- [ ] Run the focused tests and confirm green.

### Task 2: Server-authoritative checkout and order snapshots

**Files:**
- Modify: `src/modules/orders/infrastructure/repository.ts`
- Modify: `src/modules/orders/domain/service.ts`
- Modify: `src/modules/orders/server/actions.ts`
- Modify: `src/modules/orders/server/queries.ts`
- Modify: `src/modules/orders/types.ts`
- Modify: `src/modules/orders/components/checkout-client.tsx`
- Modify: `src/modules/orders/components/order-details-view.tsx`
- Modify: `src/modules/orders/components/admin-orders-client.tsx`

- [ ] Add failing assertions for authoritative quote re-resolution, subtotal/discount/shipping/total math, address ownership/cross-market rejection, carrier/rate/currency tamper rejection, and immutable snapshots.
- [ ] Run the focused tests red.
- [ ] Resolve quote inside the existing order transaction and persist quote snapshots; expose quote data in checkout queries and render company/fee/total without selector controls.
- [ ] Read order shipping company/fee from immutable snapshot with operational shipment fallback for legacy orders.
- [ ] Run focused MK-03 tests green.

### Task 3: Admin carrier/rate management

**Files:**
- Modify: `src/modules/shipping/schema.ts`
- Modify: `src/modules/shipping/types.ts`
- Modify: `src/modules/shipping/infrastructure/repository.ts`
- Modify: `src/modules/shipping/domain/service.ts`
- Modify: `src/modules/shipping/server/actions.ts`
- Modify: `src/modules/shipping/server/queries.ts`
- Modify: `src/modules/shipping/components/admin-shipping-client.tsx`
- Modify: `src/app/[locale]/(admin)/admin/shipping/page.tsx`

- [ ] Add failing admin authorization/configuration tests for Saudi/Egypt independence, enable/disable behavior, and default-carrier updates.
- [ ] Run them red.
- [ ] Add RBAC-protected create/update configuration operations using transactional upserts and the partial unique invariant; display Arabic/English identity and market-specific fee controls.
- [ ] Run focused and existing shipping tests green.

### Task 4: Verification and acceptance

**Files:**
- Modify: `package.json`
- Modify: `tests/mk03-shipping.test.ts`
- Create/modify: `e2e-tests/mk03-acceptance.spec.ts`

- [ ] Run MK-03, MK-02, MK-01, Prisma validate/status, TypeScript, lint, build, and `/api/health`.
- [ ] Run disposable Saudi/Egypt runtime acceptance in Arabic/English at desktop and 390px, including COD totals and post-order rate/name changes.
- [ ] Fix any repository-local failures and rerun the complete gates.

