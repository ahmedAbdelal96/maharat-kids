# Deployment Checklist

- [ ] Set a strong production `AUTH_SECRET` and production `DATABASE_URL` through the secret manager.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin; do not include credentials or a trailing private host.
- [ ] Set `MARKET_GEO_PROVIDER=vercel` for direct Vercel deployment, or set
      `MARKET_GEO_PROVIDER=trusted_proxy` and configure the country header plus
      `MARKET_TRUSTED_PROXY_SECRET`; strip client-supplied copies at a custom proxy.
- [ ] For Vercel, set `NEXT_PUBLIC_APP_URL=https://maharat-kids.vercel.app` and confirm the
      `x-vercel-ip-country` signal is available at runtime.
- [ ] Configure S3-compatible `PUBLIC_MEDIA` and `PRIVATE_ASSET` buckets, credentials, and `PUBLIC_MEDIA_BASE_URL`.
- [ ] Configure the selected Saudi SMS OTP, Egypt email OTP, Payzaty, and SPL provider contracts before enabling those flows.
- [ ] Confirm TLS termination, secure cookies, HSTS, and the standard security headers are active.
- [ ] Run `npx prisma migrate deploy` against the target database.
- [ ] Run the system seed with a dedicated `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only through the deployment secret manager.
- [ ] Confirm production seed did not create demo catalog data, test bank accounts, Test Express, or any fake carrier.
- [ ] Back up PostgreSQL and both object-storage buckets before release.
- [ ] Verify `GET /api/health`, the public catalog, login, logout, and `/admin` access after deployment.
- [ ] Confirm no secrets, reset codes, request bodies, or raw database errors appear in logs.
- [ ] Review the release and rollback plan before exposing traffic.

See [`production-deployment.md`](./production-deployment.md) for the complete sequence and smoke checklist.
