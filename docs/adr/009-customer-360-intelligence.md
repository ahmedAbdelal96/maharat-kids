# ADR 009: Customer 360 and operational intelligence

## Status

Accepted for the customer operations foundation phase.

## Decision

The existing `User` record remains the single customer identity. Customer
operations use `User.type = CUSTOMER`; administrators are never included in
customer list or Customer 360 queries. The existing customer profile,
address, order, cart, favorite, notification, and authentication modules are
read directly through focused repository queries rather than a duplicate
customer system.

## Authentication intelligence

`firstLoginAt`, `lastLoginAt`, and `loginCount` are updated in the same
transaction that creates a server session, after password or Google
authentication has succeeded. Failed attempts, session reads, refreshes,
navigation, and logout do not update these values. Customer registration
auto-login counts as the first successful authentication because it creates
the initial authenticated session through the same service path.

## Marketing consent

Consent is explicit and defaults to `false`. A timestamp is written only when
the customer opts in and is cleared when the customer opts out. Phase 20
does not send marketing messages or add an external marketing integration.

## Value and activity definitions

Customer value uses database aggregates. Total spent and average order value
include orders with `paymentStatus = PAID` and exclude cancelled orders.
There is no refund model in the current schema, so refund deductions are not
invented. The activity timeline is derived from existing registration,
authentication, orders, status/payment history, favorites, and notifications;
no generic activity table is introduced.

## Authorization and privacy

Customer operations require the existing `customers.view` and
`customers.update` permissions. The view intentionally excludes password
hashes, session tokens, and other authentication secrets. Customer cart and
favorite data is read-only in the admin view; mutations remain owned by the
customer modules.

## Performance

Customer lists use server-side search, filters, pagination, and database
aggregates. Customer 360 uses bounded activity/history reads and paginated
orders. New customer intelligence fields are added with a normal Prisma
migration; existing records receive safe defaults (`loginCount = 0` and
`marketingConsent = false`).
