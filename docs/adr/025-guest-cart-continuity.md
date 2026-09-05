# ADR 025: Guest Cart and Checkout Continuity

## Status

Accepted

## Decision

The single-store application uses one `Cart` model for both authenticated customers and anonymous visitors. A cart has exactly one owner: either `customerId` or a SHA-256 hash of a high-entropy guest token stored in an HTTP-only cookie.

Guest carts are created lazily when a visitor successfully adds a product. Reads and mutations resolve ownership on the server, so browser input cannot select a customer or cart. Product status, inventory, current price, and promotions are revalidated through the existing cart service.

Checkout remains CUSTOMER-only. The cart page and drawer are public, while the existing safe callback flow sends a guest to `/login?callbackUrl=/checkout` without losing the cart.

After successful CUSTOMER login or registration, the server merges the guest cart into the customer cart in a transaction. Matching products are summed, tracked inventory is clamped to current stock, unavailable products are skipped with warnings, current prices are used, and the guest cart is deleted. The guest cookie is then cleared. A failed authentication does not consume or modify the guest cart.

## Consequences

- Anonymous shopping does not create a fake customer record or reserve inventory.
- Customer carts are never exposed after logout; a subsequent anonymous cart is independent.
- Guest carts can be cleaned up later using `updatedAt` and the documented 30-day cookie retention.
- OAuth, guest checkout, coupons, guest favorites, and anonymous orders remain outside this phase.
