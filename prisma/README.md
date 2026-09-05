# Prisma

The Prisma schema currently contains identity/access models, server-managed
authentication sessions, and one `StoreSetting` model for the single ecommerce
store. Store settings use a unique key and JSON value so adding a setting does
not require a new database column.

Ecommerce models must be added deliberately by their owning domain module in a
later phase. `seed.ts` prepares the default `ADMIN` role,
permissions, and store settings; run it only after the database connection and
migration workflow are configured for the target environment. Seeding requires
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to create or activate the
development `ADMIN`; an existing user's password is not overwritten by
reseeding.
