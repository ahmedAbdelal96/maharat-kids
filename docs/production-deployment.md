# Maharat Kids production deployment

This runbook describes the repository-supported deployment boundary. It does not provision
external accounts or claim that third-party credentials are active.

## Required infrastructure

- Node.js runtime capable of running the pinned Next.js version.
- PostgreSQL with TLS/pooling configured by the hosting provider.
- S3-compatible object storage with separate public and private buckets.
- For direct Vercel deployments, Vercel's `x-vercel-ip-country` header is the market authority.
  Set `MARKET_GEO_PROVIDER=vercel`; no proxy secret is required in this mode.
- For other deployments, a reverse proxy/CDN must inject the configured market country header and
  a secret trust header, and strip client-supplied copies of both headers. Set
  `MARKET_GEO_PROVIDER=trusted_proxy`.
- Redis is not required by the current application. The process-local limiter is safe only for a
  single instance; use an edge limiter or shared store before scaling horizontally.

## Environment contract

Copy the variable names from `.env.example` into the deployment secret manager. Production requires
an HTTPS `NEXT_PUBLIC_APP_URL`, a non-localhost `DATABASE_URL`, `AUTH_SECRET`, and
`MARKET_GEO_PROVIDER=vercel`. Object storage is optional: use `STORAGE_PROVIDER=disabled` for a
safe degraded storefront, or configure `STORAGE_PROVIDER=s3` with both S3 buckets, credentials,
and `PUBLIC_MEDIA_BASE_URL`. For Vercel, use
`NEXT_PUBLIC_APP_URL=https://maharat-kids.vercel.app` and `MARKET_GEO_PROVIDER=vercel`. For
`trusted_proxy`, `MARKET_TRUSTED_PROXY_SECRET` remains mandatory.
Never put credentials in `NEXT_PUBLIC_*` variables or source control.

### Vercel Production Environment Variables checklist

Enter these names under **Vercel → Project → Settings → Environment Variables → Production**.
Values marked sensitive must come from the owning provider or operator; this repository never
stores the values.

| Name | Required? | Sensitive? | Source |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | No | Vercel configuration |
| `NEXT_PUBLIC_APP_URL` | Yes | No | operator / deployment URL |
| `DATABASE_URL` | Yes | Yes | PostgreSQL provider; use its serverless/pooling URL when offered |
| `AUTH_SECRET` | Yes | Yes | operator-generated production secret |
| `MARKET_GEO_PROVIDER` | Yes | No | Vercel configuration (`vercel`) |
| `MARKET_TRUSTED_COUNTRY_HEADER` | Recommended | No | Vercel configuration (`x-vercel-ip-country`) |
| `STORAGE_PROVIDER` | Optional | No | operator (`disabled` or `s3`) |
| `PUBLIC_MEDIA_BASE_URL` | Required for `s3` | No | Cloudflare R2 / S3 public media host |
| `STORAGE_S3_PUBLIC_BUCKET` | Required for `s3` | No | Cloudflare R2 / S3 |
| `STORAGE_S3_PRIVATE_BUCKET` | Required for `s3` | No | Cloudflare R2 / S3 |
| `STORAGE_S3_ACCESS_KEY_ID` | Required for `s3` | Yes | Cloudflare R2 / S3 |
| `STORAGE_S3_SECRET_ACCESS_KEY` | Required for `s3` | Yes | Cloudflare R2 / S3 |
| `STORAGE_S3_REGION` | Required for `s3` | No | Cloudflare R2 / S3 |
| `STORAGE_S3_ENDPOINT` | Provider-dependent | No | Cloudflare R2 / S3; required for compatible non-AWS endpoints |
| `CUSTOMER_OTP_EMAIL_PROVIDER` | Optional | No | Use `brevo` when Egypt email OTP is enabled |
| `CUSTOMER_OTP_EMAIL_API_URL` | Optional | No | Defaults to Brevo transactional email endpoint |
| `CUSTOMER_OTP_EMAIL_API_KEY` | Required for Brevo | Yes | Brevo server-side API key |
| `EMAIL_FROM` | Required for Brevo | No | Verified sender used by the email provider |
| `CUSTOMER_OTP_SMS_PROVIDER` | Optional | No | Saudi SMS provider boundary; no production adapter is registered yet |
| `CUSTOMER_OTP_SMS_API_URL` | Integration-dependent | No | Saudi SMS OTP provider |
| `CUSTOMER_OTP_SMS_API_KEY` | Provider-dependent | Yes | Future Saudi SMS provider |
| `PAYZATY_ACCOUNT_NO` | Integration-dependent | Yes | Payzaty |
| `PAYZATY_SECRET_KEY` | Integration-dependent | Yes | Payzaty |
| `PAYZATY_BASE_URL` | Integration-dependent | No | Payzaty approved production endpoint |
| `PAYZATY_STATUS_ENDPOINT` | Integration-dependent | No | Payzaty approved production endpoint |
| `SPL_PROVIDER` | Integration-dependent | No | SPL |
| `SPL_API_BASE_URL` | Integration-dependent | No | SPL |
| `SPL_API_KEY` | Integration-dependent | Yes | SPL |

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are one-time bootstrap inputs, not steady-state
runtime requirements. Supply them only for the initial bootstrap, then remove or rotate them in
Vercel. `SEED_DEMO_CATALOG` must be absent or `false` in Production. `MARKET_TRUSTED_PROXY_SECRET`
is not required for Vercel mode and must not be used as a substitute for Vercel Geo.

### Direct Vercel variable set

Configure these names in Vercel's Production Environment. Values shown with placeholders are
deployment-owned secrets or bucket identifiers; do not copy real credentials into this repository.

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://maharat-kids.vercel.app
DATABASE_URL=postgresql://...
AUTH_SECRET=<random-production-secret>
MARKET_GEO_PROVIDER=vercel
MARKET_TRUSTED_COUNTRY_HEADER=x-vercel-ip-country
STORAGE_PROVIDER=s3
STORAGE_S3_PUBLIC_BUCKET=<public-bucket>
STORAGE_S3_PRIVATE_BUCKET=<private-bucket>
STORAGE_S3_ACCESS_KEY_ID=<access-key>
STORAGE_S3_SECRET_ACCESS_KEY=<secret-key>
STORAGE_S3_REGION=<region-or-auto>
STORAGE_S3_ENDPOINT=https://<s3-compatible-endpoint>
PUBLIC_MEDIA_BASE_URL=https://<public-media-host>
```

`STORAGE_S3_ENDPOINT` may be omitted for providers using the AWS default endpoint. In Vercel mode,
`MARKET_TRUSTED_PROXY_SECRET` is intentionally not required; it remains mandatory for
`MARKET_GEO_PROVIDER=trusted_proxy`.

When object storage is disabled or incomplete, the storefront remains available, while media
uploads, protected PDF downloads, and bank-receipt uploads fail closed with a controlled
unavailable response. Production never falls back to the local filesystem or ephemeral disk.

External provider variables are intentionally explicit: Payzaty requires the merchant account,
secret, approved base URL, and status endpoint; Saudi SMS OTP, Egypt email OTP, and SPL require
the selected provider contract and credentials. Until those are supplied, their application
boundaries fail closed.

## Deployment sequence

1. Provision PostgreSQL, public/private object storage, TLS, and either Vercel geo support or the
   reverse-proxy trust headers for the selected `MARKET_GEO_PROVIDER`.
2. Load production secrets and verify the environment contract before starting the app.
3. Install dependencies with `npm ci`.
4. Apply only committed migrations with `npm exec -- prisma migrate deploy`.
5. Build with `npm run build`, then run the built app with `npm start` (never `next dev`).
6. Verify `GET /api/health` and the safe smoke checklist below.
7. Bootstrap the first Admin once using explicit `SEED_ADMIN_EMAIL` and
   `SEED_ADMIN_PASSWORD` from the secret manager, then remove or rotate those bootstrap values.
8. Configure a real carrier, bank accounts, Payzaty, OTP providers, and SPL in Admin/provider
   infrastructure. The seed never creates an operational carrier or fake production bank account.

## Database and storage migration

Use `npm exec -- prisma migrate deploy`; never use `prisma migrate reset` in production.
For an existing local media installation, review `npm run storage:migrate -- --dry-run`, then run
the copy only after public/private bucket policies and backups are confirmed. The migration is
idempotent and does not alter database relationships.

## Backups and restore

Schedule encrypted, versioned PostgreSQL backups and object-storage versioning/replication outside
the app host. Restore into an isolated database and validate the matching object buckets before
switching traffic. Do not roll back migrations destructively; deploy a compatible previous app
release or restore the full database/object snapshot only after an incident decision.

## Safe smoke checklist

- `/api/health` returns only `status` and a correlation request id.
- Public catalog/blog media load from public storage.
- Anonymous/private PDF and bank-receipt requests are denied.
- Admin login/RBAC works; customer OTP and provider flows use the configured external providers.
- Saudi/Egypt market is derived from Vercel infrastructure geo or trusted proxy headers, not locale
  or browser input.
- COD, bank transfer, and Payzaty are enabled only after real Admin/provider configuration.

## Rollback

Stop traffic, preserve request/error identifiers, and redeploy the previous compatible application
release. Confirm migration compatibility before switching `DATABASE_URL`; do not run a destructive
database reset or delete object buckets as part of rollback.
