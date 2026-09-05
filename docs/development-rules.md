# Development rules

- Keep Server Components as the default. Add `use client` only for stateful or interactive UI.
- Keep route files thin; call module queries or Server Actions instead of putting business logic in `app`.
- Authenticate and authorize every Server Action before mutation work is added.
- Keep database access behind repositories and the server-only database boundary.
- Validate external input with Zod at the module boundary.
- Prefer typed `Result` values for expected service failures and typed core errors for business exceptions.
- Use the shared logger rather than scattering ad hoc logging integrations.
- Do not import `src/server`, `src/database`, or server module files into Client Components.
- Use `@/*` imports for source paths and avoid barrel imports when a direct import is clearer.
- Add cache tags and targeted revalidation when implementing read/write flows.
- Keep business configuration in `src/config/business.config.ts` so the framework remains customizable.
- Treat each project as one independent ecommerce application serving one business, one store, and one catalog.
- Keep store settings application-wide: name, logo, business information, contact information, currency, language, SEO defaults, and general ecommerce settings.
- Keep the account boundary explicit: public registration creates `CUSTOMER`; administration creation creates `ADMIN`. Never accept account type, role, or permissions from a public browser request.
- Treat roles and permissions as administration RBAC only. Never infer administration access from a role name in place of the `User.type` and permission checks.
