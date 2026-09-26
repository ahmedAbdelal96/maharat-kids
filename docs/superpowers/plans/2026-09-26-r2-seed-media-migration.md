# R2 Seed Media Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upload repository-owned demo/seed media to the configured R2 public/private buckets and update only matching shared-database references idempotently.

**Architecture:** Reuse the existing `ObjectStorage` boundary and Prisma models. A narrowly scoped operator script will discover immutable public files and demo private PDFs, verify checksums, upload missing/mismatched objects, and update only the 101 seed/demo Media rows and four demo DigitalAsset rows. Existing bundled static media remains untouched as fallback.

**Tech Stack:** TypeScript, Node `tsx`, Prisma, AWS SDK S3-compatible provider, Node test runner.

**Spec:** User-provided R2 Storage Activation + Demo Seed Media Migration brief.

## Global Constraints

- Use real local `.env` configuration without printing credentials.
- Do not push, create a PR, commit `.env`, or mutate production startup behavior.
- Scope changes to repository-owned seed/demo assets; never touch user content.
- Keep paid PDFs private and never place them in `public/` or the public bucket.
- Preserve the bundled static fallback and make the migration idempotent.
- Do not create a Prisma schema migration.

## Review Focus

- A dry run must perform no uploads or database writes.
- Existing same-key objects must be skipped when their bytes match and safely replaced only for the same seed asset when bytes differ.
- Legacy `/uploads/...` seed references must canonicalize to R2 URLs without changing unrelated media.
- Missing local seed files and unexpected database references must be reported, not silently ignored.
- Private PDF objects must be uploaded only to the private provider and never receive a public URL.

### Task 1: Pure migration classification and key policy

**Files:**
- Create: `src/modules/storage/domain/seed-media-migration.ts`
- Test: `tests/seed-media-migration.test.ts`

- [ ] Write failing tests for deterministic keys, MIME mapping, supported seed scope, private PDF detection, and rejection of absolute/local paths.
- [ ] Run the focused test and confirm it fails because the module is absent.
- [ ] Implement the minimal pure helpers and rerun the focused test.

### Task 2: Idempotent operator migration and R2 probe

**Files:**
- Create: `scripts/migrate-seed-media-r2.ts`
- Modify: `package.json`
- Test: `tests/seed-media-migration.test.ts`

- [ ] Add dry-run and `--confirm` modes, safe production guard, checksum-aware upload/skip behavior, disposable public/private connectivity probe, scoped Prisma snapshot/update, and count-only JSON output.
- [ ] Add `seed-media:migrate-r2` package script using `node --env-file=.env`.
- [ ] Test dry-run against the real shared database and execute the confirmed migration.

### Task 3: Verification and documentation

**Files:**
- Modify: `docs/production-storage.md`, `docs/demo-catalog.md`

- [ ] Document the operator command, canonical R2 keys, idempotency, and static fallback.
- [ ] Verify representative public URLs, private access behavior, database relationships, no schema migration, optional-storage behavior, and all quality gates.
