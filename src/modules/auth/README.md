# Authentication Core

This module provides customer and administration authentication for one
ecommerce application. It uses server-managed sessions rather than JWTs.
Customer email/password registration, password recovery, and optional Google
sign-in are supported without changing the existing admin identity model.

## Flow

1. `login` validates credentials and looks up the existing Identity `User`.
2. The password hash is verified with the scrypt-based password hasher.
3. Only `ACTIVE` users can authenticate.
4. A random opaque session token is placed in an HTTP-only cookie; only its
   SHA-256 hash is stored in the database.
5. `getCurrentUser` resolves the session and returns a safe user with roles and
   permissions.
6. `logout` verifies the current cookie belongs to the requested session,
   deletes the database session, and clears the cookie.
7. Customer registration always creates a `CUSTOMER` user without assigning an
   administration role.
8. Password recovery stores only a hash of the short-lived verification code,
   limits attempts, and invalidates all user sessions after a successful reset.
9. Google sign-in is enabled only when the `auth.google.enabled` store setting
   and the required Google environment variables are present. Google accounts
   are customer accounts; administrator email addresses cannot use this flow.

The module delegates permission decisions to the existing Identity
`AuthorizationService`. The optional Google integration is implemented behind
the same module boundaries so it can be replaced later without changing the
application routes.
