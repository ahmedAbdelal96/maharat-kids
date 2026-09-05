# ADR 006: Server-managed authentication

## Status

Accepted for the backend foundation phase.

## Decision

Authentication uses email/password credentials, the existing Identity `User`
model, and database-backed server sessions. A successful login creates a
cryptographically random opaque token. The browser receives the token in an
HTTP-only, same-site cookie, while the database stores only its SHA-256 hash.
Sessions expire after a fixed 30-day lifetime.

## Authentication flow

The auth Server Action validates input, then delegates to `AuthService`. The
service finds the user, verifies the scrypt password hash, allows only `ACTIVE`
users, loads roles and permissions through the existing Identity relations, and
creates the session. Login and password failures use the same generic message
to avoid leaking whether an email exists.

`getCurrentUser` reads the cookie on the server, resolves the hashed token,
checks expiration and user status, and returns only a safe user projection with
roles and permission keys. Administration roles and permission keys are loaded
only for `ADMIN` users; a `CUSTOMER` uses the same authentication/session
system but has no administration RBAC access. `logout` verifies that the
requested session belongs to the current cookie before deleting it and
clearing the cookie.

## Security decisions

- Passwords are never stored in plain text; scrypt with a per-password random
  salt and the existing server-only `AUTH_SECRET` pepper is used.
- Session tokens are random, opaque, HTTP-only, secure in production, and never
  persisted in plain text.
- Server Actions validate untrusted input and the service performs the actual
  authentication checks.
- Permission checks continue through the existing Identity
  `AuthorizationService`; the auth module does not introduce another ACL.

## Customer registration and recovery

Customer registration always creates a `CUSTOMER` user without an admin role.
Password recovery stores only a hash of a short-lived six-digit code, limits
failed attempts, and deletes all of that customer's sessions after a successful
password change.

## Optional Google sign-in

This template targets one independent ecommerce application. Database sessions
are straightforward to revoke and fit the existing Prisma boundary. Google
sign-in is optional and is shown only when `auth.google.enabled` and the
required provider credentials are configured. Google accounts are linked in
`OAuthAccount` and are restricted to `CUSTOMER` users; administrator accounts
cannot use the customer Google flow. The provider is isolated behind auth
interfaces so it can be replaced later without changing sessions or
authorization.
