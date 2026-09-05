# ADR 004: Identity and access core

## Status

Accepted for the backend foundation phase.

## Decision

Use separate `User`, `Role`, and `Permission` models connected through explicit
`UserRole` and `RolePermission` join models. Keep authorization checks in the
identity domain service and expose typed `Result` values to callers.

`User.type` explicitly separates `ADMIN` accounts from `CUSTOMER` accounts.
Roles and permissions are administration RBAC concepts only; `CUSTOMER` is an
account type, not a role. Only `ADMIN` users may receive `UserRole` records.

## Why roles and permissions are separate

Roles are reusable bundles of responsibility, while permissions are stable
capabilities such as `products.create` or `orders.update`. Separating them lets
future ecommerce applications add or compose roles without changing application code, and lets
authorization checks depend on capabilities rather than role names.

## Authorization strategy

`AuthorizationService.hasPermission` performs a read-only permission lookup.
It first requires an `ADMIN` account, so customer data cannot gain
administration permissions from an accidental role assignment.
`requirePermission` converts a missing capability into a typed
`ForbiddenError`. Repositories are the only layer allowed to query Prisma;
services catch unexpected infrastructure failures and return typed failures.

## Future authentication integration

Password hashing and sessions are represented by replaceable interfaces. An
Auth.js, JWT, OAuth, or custom adapter can implement those interfaces later.
No provider, credential flow, cookie handling, or login UI is coupled to this
module today.
