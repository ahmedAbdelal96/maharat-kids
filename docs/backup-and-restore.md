# Backup and Restore Runbook

Use PostgreSQL-native backups for the application database. Schedule encrypted, versioned backups outside the application host and test a restore into an isolated database regularly.

Before a restore:

1. Put the application in maintenance mode at the deployment layer.
2. Record the current migration and backup identifiers.
3. Restore into a separate database first and validate the application against it.
4. Switch `DATABASE_URL` only after validation, then run `npx prisma migrate deploy`.

Media is stored under `public/uploads` by the current local provider. Back up that directory together with the database, or replace the provider with durable object storage before a multi-instance or ephemeral deployment. Database media rows without their files are not recoverable images.

Never put `DATABASE_URL`, `AUTH_SECRET`, seed passwords, or provider API keys in a backup manifest, issue, or log.
