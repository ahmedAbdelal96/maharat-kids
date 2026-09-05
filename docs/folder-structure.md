# Folder structure

This framework is organized for one independent ecommerce application with one
store configuration and one catalog.

| Folder | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, loading states, and error boundaries |
| `src/modules` | Feature-owned server, domain, infrastructure, validation, types, constants, and components |
| `src/core` | Business-agnostic errors, results, permissions, constants, and shared types |
| `src/server` | Server-only application services such as auth, cache, database access, errors, and logging |
| `src/database` | Prisma client/adapter boundary; model definitions remain in the module-organized Prisma schema |
| `src/config` | Application, single-store business, feature, and environment configuration |
| `src/components` | Presentation components shared by multiple modules |
| `src/providers` | Reserved composition point for cross-cutting React providers |
| `src/lib` | Framework-agnostic shared utilities and integrations |
| `src/types` | Shared application types such as pagination and result aliases |
| `docs` | Durable architecture and development guidance |

Each module follows this shape:

```text
module/
├── components/
├── server/
│   ├── actions.ts
│   └── queries.ts
├── domain/
│   ├── service.ts
│   ├── mutations.ts
│   └── rules.ts
├── infrastructure/
│   └── repository.ts
├── schema.ts
├── types.ts
└── constants.ts
```
