# Backup and Restore Runbook

Use PostgreSQL-native backups for the application database. Schedule encrypted, versioned backups outside the application host and test a restore into an isolated database regularly.

Before a restore:

1. Put the application in maintenance mode at the deployment layer.
2. Record the current migration and backup identifiers.
3. Restore into a separate database first and validate the application against it.
4. Switch `DATABASE_URL` only after validation, then run `npx prisma migrate deploy`.

Production media is stored in the MK-10 public/private object-storage buckets. Enable bucket
versioning/replication and include both buckets in the backup plan; private PDFs and bank receipts
must never be copied into `public/uploads`. For local development, back up `public/uploads` and
`.private` only as disposable fixtures. Database media rows without their corresponding objects
are not recoverable.

Never put `DATABASE_URL`, `AUTH_SECRET`, seed passwords, or provider API keys in a backup manifest, issue, or log.
