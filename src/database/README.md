# Database boundary

The generated Prisma client and its singleton boundary live here. Prisma
models are defined in `/prisma/schema.prisma`; the current schema is limited to
identity/access, server-managed authentication sessions, and the single-store
`StoreSetting` model. Feature repositories are the only application layer that
should call this boundary.
