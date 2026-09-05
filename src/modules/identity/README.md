# Identity & Access

This backend-only module owns users, roles, permissions, role assignments,
validation, authorization policies, and the replaceable security abstractions
consumed by the Authentication Core.

## Authorization flow

```text
Server Action / Query
        ↓
IdentityService or AuthorizationService
        ↓
UserRepository / RoleRepository / PermissionRepository
        ↓
Prisma identity models
```

`AuthorizationService.hasPermission` and `requirePermission` return the shared
typed `Result` contract. The Authentication Core supplies the current session
and password implementation without changing these authorization rules.

`User.type` is the account boundary: `ADMIN` accounts may participate in
administration RBAC, while `CUSTOMER` accounts have no administration role or
permission assignments. `CUSTOMER` is not a `Role`.
