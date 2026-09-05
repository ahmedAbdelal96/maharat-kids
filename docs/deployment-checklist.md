# Deployment Checklist

- [ ] Set a strong production `AUTH_SECRET` and production `DATABASE_URL` through the secret manager.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin; do not include credentials or a trailing private host.
- [ ] Configure production email delivery (`RESEND_API_KEY` and `EMAIL_FROM`) before enabling password reset for customers.
- [ ] Confirm TLS termination, secure cookies, HSTS, and the standard security headers are active.
- [ ] Run `npx prisma migrate deploy` against the target database.
- [ ] Run the system seed with a dedicated `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only through the deployment secret manager.
- [ ] Keep `SEED_DEMO_CATALOG` unset/false in production unless demo data is intentionally required.
- [ ] Back up PostgreSQL and `public/uploads` (or configure durable media storage) before release.
- [ ] Verify `GET /api/health`, the public catalog, login, logout, and `/admin` access after deployment.
- [ ] Confirm no secrets, reset codes, request bodies, or raw database errors appear in logs.
- [ ] Review the release and rollback plan before exposing traffic.
