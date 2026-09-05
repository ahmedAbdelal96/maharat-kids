# Architecture

This project is a reusable framework for independent single-store ecommerce
applications. Each implementation represents one business, one store, one
catalog, and one customer base. The codebase uses feature-based modules so each
business capability owns its validation, domain rules, server functions, data
access contract, and UI.

## Application shape

```text
One Ecommerce Application
        |
Single Store Configuration
        |
Catalog · Orders · Customers · Inventory · Payments · Shipping
```

The Store Configuration module is application-wide and covers store name,
logo, business and contact information, currency, language, SEO defaults, and
general ecommerce settings.

Identity uses one `User` model. `User.type` distinguishes administration
accounts from storefront customers. Roles and permissions apply only to
`ADMIN` users; `CUSTOMER` is not an administration role.

## Data flow

```text
Route / Server Component
        ↓
Module server query or Server Action
        ↓
Domain service and rules
        ↓
Infrastructure repository
        ↓
Database adapter (Prisma boundary)
```

The `app` directory is only the Next.js routing layer. Prisma access remains
behind the database and repository boundaries, with each model grouped under
its owning module section in the schema.

## Result and error contracts

Use `src/core/result` for expected service outcomes and
`src/core/errors` for typed business errors. Unexpected errors may still be
handled by the framework error boundary and logged through `src/server/logger`.
