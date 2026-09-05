# Admin Dashboard Foundation

This backend-and-routing module prepares the protected `/admin` application
area inside the same Next.js app as the store. It does not contain dashboard
UI, widgets, data queries, or styling.

`getAdminContext` first resolves the current server session and then requires
the existing `admin.access` permission through the Identity authorization
system. It returns a safe user, roles, and permission keys for future dashboard
modules. No role name is treated as an authorization rule.

`adminNavigation` is configuration only. A future UI can filter it using the
returned permissions without coupling navigation to the route components.

Each current route placeholder calls the admin guard. Future dashboard data
should continue the existing query/service/repository flow and repeat its own
authorization checks at the data boundary.

## Administration users

The `/admin/users` flow manages `ADMIN` accounts only. Customer accounts remain
in the customer domain and cannot access administration.

Future public registration must always create a `CUSTOMER` user. The request
must not be allowed to choose an administration role; that rule belongs in the
backend boundary, not only in a registration form.
