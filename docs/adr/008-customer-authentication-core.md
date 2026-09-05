# ADR 008: Customer Authentication Core

## Decision

Customer authentication uses the existing Identity and server-session
foundation. Customers can register with email and password, sign in, sign out,
recover a password with a short-lived six-digit code, and use optional Google
sign-in when `auth.google.enabled` and the required provider environment
variables are configured.

## Boundaries

- Customer registration always creates `User.type = CUSTOMER`.
- Customer accounts do not receive administration roles.
- Existing admin authentication, roles, permissions, and guards remain
  unchanged.
- `/account` requires an authenticated customer; administration remains
  permission-protected under `/admin`.

## Security decisions

- Passwords use the existing scrypt hasher and are never stored in plaintext.
- Sessions remain server-managed with opaque browser tokens and database
  expiration; JWT sessions are not introduced.
- Password reset codes are stored only as hashes, expire after ten minutes,
  allow a bounded number of attempts, and are delivered through a replaceable
  email service.
- A successful password reset deletes all sessions for that customer.
- Google accounts are stored in `OAuthAccount` and are customer-only. An admin
  email cannot authenticate through the customer Google flow.

## Consequences

The public store can add customer authentication without duplicating the admin
identity system. Email delivery and Google credentials remain optional for
local development and replaceable for production integrations.
