# Cart

The cart supports two owners in this single-store application:

- An authenticated `CUSTOMER`, identified by `customerId`.
- An unauthenticated visitor, identified by a signed-by-application, HTTP-only guest cookie whose SHA-256 hash is stored as `guestTokenHash`.

Guest carts are created lazily on the first successful add-to-cart operation. They are retained for 30 days by the browser cookie and are merged into the customer cart after customer login or registration. The merge is transactional and removes the guest cart after completion, so a guest cart cannot be merged twice.

Guest checkout is intentionally not enabled: `/checkout` still requires an authenticated CUSTOMER. The cart and product pages remain publicly browseable.

All cart mutations resolve ownership on the server. Item prices are server-authoritative snapshots from the current product record; browser-submitted prices are never accepted. Product validity, availability, and current prices are revalidated before cart operations.
