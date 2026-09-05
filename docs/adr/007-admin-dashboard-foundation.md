# ADR 007: Admin dashboard foundation

## Status

Accepted for the routing and backend foundation phase.

## Decision

The admin dashboard lives inside the same Next.js application under the
`(admin)` route group and `/admin` URL segment. Store and admin routes share
the existing authentication, Prisma boundary, deployment, and feature
modules.

## Protection strategy

Admin route components use the server-only `getAdminContext` guard. The guard
resolves the current server session, requires `User.type === ADMIN`, then calls
the existing Identity authorization service with `admin.access`. Unauthenticated users are sent to
the future login route; authenticated users without the permission are sent
to the future forbidden route.

Authorization is permission-based. Roles are returned as context data but are
never compared directly in route code. Future pages and dashboard data
queries must continue to authorize at their own boundary because layouts are
not a substitute for leaf-level data protection.

## Foundation versus UI

This phase creates route groups, protected placeholder pages, an admin context,
and navigation configuration. It intentionally does not create a sidebar,
cards, charts, tables, forms, or dashboard statistics. Future dashboard data
must follow the existing query, service, repository, and database flow.
