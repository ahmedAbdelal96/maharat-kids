# Store Settings Core

This backend-only module stores configuration for one ecommerce application and
one store. It intentionally uses one `StoreSetting` table with a unique key and
JSON value instead of a generic configuration metadata engine.

The domain service exposes only the operations the future dashboard needs:

- Read one setting with `settings.view`.
- Read all settings with `settings.view`.
- Update one or many settings with `settings.update`.

Validation is concrete and lives in the service for known template settings,
including the three supported currencies: USD, EGP, and SAR. Adding a new
setting means adding a seeded key/value and, when needed, a small rule for that
setting; it does not require metadata tables or a form renderer.

All database access stays in `infrastructure/repository.ts`. Successful updates
invalidate the shared store configuration cache tag so future reads can use
Next.js caching and revalidation without a custom cache framework.
