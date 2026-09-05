# ADR 030: Admin Audit Log

## Status

Accepted.

## Decision

The application keeps a small, append-only `AuditLog` table for successful administrator business mutations. Each entry stores the authenticated actor's name and email snapshot, a typed action, a generic entity reference, a human-readable entity label, controlled field changes, and safe operational metadata.

The audit trail is intentionally separate from customer activity, page analytics, request telemetry, and the existing domain histories. Automatic cart, inventory, promotion, notification, and rating side effects are not logged as admin actions. One meaningful admin action should remain one understandable audit entry.

## Security and privacy

Audit creation is server-only and receives actor identity from the authenticated admin session. The browser cannot select the actor. The centralized sanitizer rejects sensitive field names and limits nested payloads. Passwords, hashes, tokens, codes, secrets, credentials, and full customer address data are never written to changes or metadata.

The actor relation uses `onDelete: SetNull`, while snapshots keep historical entries readable if an account is later removed. There is no audit edit, delete, clear, or retention operation.

## Read model

`audit.view` is the only audit permission. The admin Activity Log uses server-side search, entity/action filters, newest-first pagination, and a compact human-readable table. Details expand only controlled field changes and request IDs; raw ORM objects and JSON blobs are not the primary interface.

## Consistency note

The writer is a server-side infrastructure boundary and is intended to be called only after a successful domain mutation. High-value mutations that later need strict all-or-nothing auditing should pass the repository transaction client through their existing transaction boundary rather than introducing a second mutation path.
