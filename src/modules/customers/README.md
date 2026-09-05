# Customers Module

This module owns customer self-service and the small administration surface for
customer accounts in the single-store application.

- `/account` loads the authenticated customer's profile and addresses through
  the customer service and repository.
- Profile edits are limited to name, email, and phone. The authenticated
  session determines the target user.
- Address CRUD is ownership-scoped and keeps at most one default address per
  customer. The first address is default automatically.
- Local password changes reuse the existing scrypt hasher and keep the current
  session while invalidating other sessions. Google-only accounts receive an
  explanatory message instead.
- Administration reads only `User.type = CUSTOMER` and uses `customers.view`
  and `customers.update` permissions.
