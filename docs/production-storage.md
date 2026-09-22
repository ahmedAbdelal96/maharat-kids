# Production storage

MK-10 uses one storage boundary with two explicit policies:

- `PUBLIC_MEDIA`: product, variant-associated product, category/promotion, and blog cover images. New objects use generated keys and are served through the configured public base URL (or `/uploads` in local development).
- `PRIVATE_ASSET`: paid digital PDFs and bank-transfer proofs. Objects are never returned as URLs; application routes authorize each request and stream bytes server-side.

## Configuration

Local development and the deterministic Playwright harness use the filesystem provider:

```text
STORAGE_PROVIDER=local
PUBLIC_STORAGE_ROOT=./public/uploads       # optional
PRIVATE_STORAGE_ROOT=./.private             # optional
```

Production must use an S3-compatible provider with separate public/private buckets:

```text
STORAGE_PROVIDER=s3
STORAGE_S3_ENDPOINT=https://...            # optional for AWS; required for R2/MinIO-style endpoints
STORAGE_S3_REGION=...
STORAGE_S3_PUBLIC_BUCKET=...
STORAGE_S3_PRIVATE_BUCKET=...
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
PUBLIC_MEDIA_BASE_URL=https://cdn.example/... 
```

The private bucket/container must deny anonymous listing and GET access. Credentials are server-only and are never placed in `NEXT_PUBLIC_*` variables. Production fails closed when durable storage configuration is missing; private files never fall back to `public/uploads`.

## Private download model

`/api/digital-assets/{assetId}/download` checks the current customer session, active entitlement ownership, active asset status, and checksum before streaming a PDF with `private, no-store` and `nosniff` headers. The browser receives only this protected route. Bank-transfer proof access applies the existing customer/admin authorization and the same private object provider.

## Migration and testing

The current repository contains no private legacy files under `public/uploads`; seeded SVGs are intentional public media. Existing `.private/digital-assets` and `.private/payment-proofs` keys remain compatible with the local provider. A future object migration should be run with provider credentials, be idempotent, and preserve `Media`, `DigitalAsset`, and `BankTransferSubmission` relationships. The Playwright harness sets `MK_E2E_TEST_MODE=1` and uses disposable local storage; it never requires cloud credentials.
