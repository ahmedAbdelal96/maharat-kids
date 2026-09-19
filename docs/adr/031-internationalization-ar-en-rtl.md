# ADR 031: Arabic/English internationalization and RTL/LTR routing

## Status

Accepted and implemented.

## Decision

The application supports Arabic (`ar`) and English (`en`) through `next-intl`. Arabic is the application default and English is the secondary locale. Locale configuration is centralized in `src/config/locale.ts`; the `NEXT_LOCALE` cookie is a presentation preference and is not stored in the database.

All user-facing pages are rendered beneath `src/app/[locale]`. The locale middleware redirects the root and legacy unprefixed URLs to the selected locale without maintaining a second page tree. Technical routes such as `/api`, `robots.txt`, and `sitemap.xml` remain outside the locale segment.

## Navigation and state

Internal links use the navigation helpers in `src/i18n/navigation.ts`. The header and mobile menu switch locales in place, retaining dynamic route segments and query parameters. Authentication callback targets are validated by the existing safe-return policy and normalized before navigation, preventing open redirects and duplicated locale prefixes.

## Messages

Messages are split by domain under `messages/ar` and `messages/en` rather than bundled into one large file. The request configuration loads only the selected locale. Server components remain the default; client components use `useTranslations` only where their existing interactivity already requires a client boundary.

## Localized business content

Customer-facing catalog content uses `ProductTranslation`, `CategoryTranslation`, and `PromotionTranslation` with one row per locale and a unique `(entity, locale)` constraint. Shared identifiers and business facts remain language-neutral: slugs, SKUs, prices, inventory, order numbers, coupon codes, and stored enum values are not translated. Read projections use requested locale, Arabic fallback, then the existing base value, so incomplete translations do not break a page.

Existing records are preserved; the seed backfills bilingual content for the seeded catalog. Historical order, audit, notification, and user-generated text is not rewritten.

## Direction and formatting

The locale layout sets server-rendered `<html lang>` and `dir` (`rtl` for Arabic, `ltr` for English), preventing a direction flash. Shared layout components use logical direction utilities where direction changes meaning. Directional icons are mirrored only when their semantics require it; product images and non-directional icons are unchanged.

## SEO

Public sitemap entries are emitted for both locale paths. Canonical URLs are locale-specific, and public metadata is generated within the locale tree. Public routes use stable shared slugs, while localized names and descriptions are projected for the current request. Admin, account, authentication, and checkout routes are not included in the sitemap.

## Performance and boundaries

Locale resolution is middleware/request configuration work only; it does not query Prisma on every navigation. Translation joins are included in the existing Product, Category, Promotion, and Search repository queries, avoiding per-card translation requests. Domain services remain language-neutral and do not call `next-intl`.

## Known intentional limits

This is a single-store application. There is no locale-specific currency, pricing, database, or store model. Product/category/promotion slugs remain shared across locales to preserve links. Some historical/generated business records may retain the language in which they were originally stored; surrounding UI labels are localized without mutating history.
