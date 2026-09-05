# ADR 010: Customer Segments and Marketing Audiences

## Decision

Customer segments are predefined, virtual PostgreSQL queries over the existing `User`, `Order`, `Cart`, and `Favorite` data. No segment table, generic segment builder, campaign system, tracking system, or separate customer database is introduced.

The shared qualifying-order definition remains `paymentStatus = PAID` and `status != CANCELLED`, matching Customer Intelligence and Customer 360. It is centralized in the existing customer intelligence repository so revenue, repeat-purchase, and high-value audiences use the same business rule.

Inactive audiences use `lastLoginAt` when present. Accounts without a successful login use `createdAt` as their activity reference. Recently registered audiences use a small server-validated period (7 or 30 days), while inactive audiences use 30, 60, or 90 days.

## Authorization and exports

The segments page requires `customers.view`. CSV export requires `customers.export`, which is assigned to the existing ADMIN role by seed. Marketing exports always force `marketingConsent = true`; operational exports are explicit and remain subject to the selected filters. CSV cells beginning with spreadsheet formula characters are prefixed defensively to reduce formula-injection risk.

All filtering, aggregation, pagination, and authorization happen on the server. The browser receives only the current page of safe customer audience fields and never receives passwords, sessions, OAuth records, or internal database errors.

## Consequences

This keeps the small single-store application easy to operate while allowing future campaigns to consume stable audience definitions. Adding a new predefined audience is a code change, intentionally preferred over a generic configuration engine until the business requires one.

