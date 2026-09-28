# Final Storefront Query Reduction Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace broad storefront product reads with one bounded card projection and one bounded PDP projection, then verify real PostgreSQL query counts, timings, and business behavior.

**Architecture:** Keep Prisma repository boundaries and existing Product domain semantics, but add explicit storefront read methods. The card read model will be shared by homepage, products, category, and related grids; the PDP method will select only current-locale detail data, variants/options, public media, market prices, and required education fields. Request-scoped React cache remains the only cache.

**Tech Stack:** Next.js 16, React Server Components, Prisma, PostgreSQL, TypeScript, Node test runner.

**Spec:** `C:/Users/IT/.codex/attachments/7d7c4ef1-801e-4265-b92c-31301d8aaebe/Pasted text.txt`

## Global Constraints

- Do not reset or discard current uncommitted performance/cart changes.
- Do not commit or push.
- Preserve EG/SA market authority, pricing, variants, inventory, R2/media, and cart semantics.
- Do not add migrations without query-plan proof.
- Do not add global/persistent cache or extra client HTTP work.

## Review Focus

- Locale-specific translation fallback remains correct for Arabic and English card/PDP reads.
- Variant override and fallback market pricing remain authoritative for EG and SA.
- Primary and related media continue resolving through public R2 URLs.
- Anonymous PDP avoids favorite/eligibility customer queries while authenticated PDP keeps minimal state.
- Category, skills, age metadata, reviews, and digital-product behavior remain complete where rendered.

### Task 1: Define shared storefront card read model

**Files:**
- Modify: `src/modules/products/types.ts`
- Modify: `src/modules/products/infrastructure/repository.ts`
- Modify: `src/modules/products/domain/service.ts`
- Modify: `src/modules/products/server/queries.ts`

- [ ] Add a card-specific view model and repository/service loader with bounded product, current-locale translation, primary media, current-market price, minimal active-variant state, and batched rating summary.
- [ ] Reuse the existing public filter predicates and pagination/count behavior.
- [ ] Add tests asserting one collection loader does not perform per-product relation reads.

### Task 2: Replace the broad PDP loader

**Files:**
- Modify: `src/modules/products/infrastructure/repository.ts`
- Modify: `src/modules/products/server/queries.ts`
- Modify: `src/app/[locale]/(store)/products/[slug]/page.tsx`

- [ ] Add a deliberate PDP projection for only rendered fields and current-locale data.
- [ ] Remove unused assignment, historical, and private fields from the PDP query.
- [ ] Reuse product category/IDs already loaded and parallelize independent review, promotion, related, and eligibility work.
- [ ] Consolidate public review summary/records and preserve authenticated eligibility behavior.

### Task 3: Route all storefront grids through the card contract

**Files:**
- Modify: `src/app/[locale]/(store)/page.tsx`
- Modify: `src/app/[locale]/(store)/products/page.tsx`
- Modify: `src/app/[locale]/(store)/categories/[slug]/page.tsx`
- Modify: `src/components/ecommerce/product-grid.tsx`
- Modify: `src/components/ecommerce/product-card.tsx`
- Modify: `src/components/ecommerce/quick-view-modal.tsx`

- [ ] Use the same card loader for homepage, products, category, and related grids.
- [ ] Ensure ProductCard and immediate helpers make zero database calls.
- [ ] Preserve favorites, add-to-cart, variant routing, price display, image behavior, and accessibility.

### Task 4: Verify query structure and business behavior

**Files:**
- Create or modify: focused storefront read-model tests under `tests/`
- Temporary only: Prisma query profiler, removed before completion

- [ ] Profile `/ar`, `/ar/products`, one category, and one PDP with redacted query shapes and durations.
- [ ] Capture production-build SSR timings and top three remaining slow query shapes.
- [ ] Run all requested test, Prisma, TypeScript, lint, and build gates.
- [ ] Confirm no profiler, secrets, migration, commit, or push remains.
