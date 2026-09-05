# Ecommerce Template

A reusable, single-store ecommerce foundation for building independent online stores. Each project represents one business, one catalog, and one customer base; this repository is not a multi-tenant SaaS platform.

## What is included

- Next.js 16 App Router with Turbopack and TypeScript
- Feature-based modules for identity, authentication, store settings, catalog, cart, checkout, orders, payments, shipping, returns, promotions, coupons, reviews, favorites, notifications, and audit logs
- PostgreSQL-ready Prisma ORM with committed migrations and an idempotent development seed
- Server-managed sessions, password hashing, RBAC permissions, validation, audit logging, and server-only boundaries
- Customer account and administration workflows in the same application
- Responsive storefront and admin foundations using Tailwind CSS and the existing design system

## Requirements

- Node.js 20+
- npm
- PostgreSQL 14+

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL`, `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`. Never commit `.env` or real credentials.

3. Apply database migrations and seed development data:

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), or the port configured by your local environment.

## Useful commands

```bash
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
npx prisma migrate deploy
npx prisma db seed
```

## Architecture

The application follows a feature-based modular architecture. A business feature owns its domain rules, validation, types, server actions/queries, infrastructure repository, and components.

```text
UI / Route
  -> Server Action or Query
  -> Domain Service
  -> Repository
  -> Prisma / PostgreSQL
```

`src/app` is the routing layer only. Shared infrastructure lives in `src/core`, `src/server`, `src/lib`, `src/database`, `src/config`, and `src/types`. Domain features live in `src/modules`.

Server Components are the default. Client Components are reserved for stateful or interactive experiences. Database access and server-only code stay behind server boundaries.

## Project structure

```text
src/
├── app/          Next.js routes, layouts, loading, and error boundaries
├── modules/      Feature-owned domain, server, infrastructure, and UI code
├── components/   Shared presentation primitives
├── core/         Shared errors, results, constants, permissions, and types
├── server/       Database, auth, cache, logging, and server utilities
├── database/     Prisma client boundary
├── config/       Environment and application configuration
└── types/        Shared application types
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
docs/             Architecture decisions and development rules
```

## Authentication and authorization

Authentication uses email/password login with a secure scrypt-based password hash and server-managed sessions. Administration access is permission-based through the existing RBAC system. Customer and administration accounts are separate account types.

## Frontend design guidance

Frontend work must follow `AGENTS.md` and read `.agents/skills/taste-skill/SKILL.md` before implementation. Reuse the existing tokens, components, accessibility patterns, and motion architecture; the design skill must not trigger unrelated architectural rewrites.

## Data and security notes

- Use PostgreSQL for local and production data.
- Run migrations with `prisma migrate deploy` in deployment environments.
- Seed data is intended for development and is idempotent.
- Keep secrets, local uploads, build output, and test results out of version control.
- Do not add business logic to route components.

## License

This project is private and intended as a reusable internal ecommerce template.
