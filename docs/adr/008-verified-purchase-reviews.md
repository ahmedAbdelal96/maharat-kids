# ADR 008: Verified purchase reviews

## Decision

Product reviews are stored in one `ProductReview` table and are linked to the
customer, product, and exact `OrderItem` that qualified the review. The review
service verifies the customer, paid order, delivered/completed status, gift
exclusion, and physically returned quantity on the server. A database unique
constraint also enforces one review per customer and product.

Only approved reviews are public. Customer edits change the rating/comment and
return moderation to `PENDING`; moderation fields and purchase linkage cannot
be changed by the customer. Rejection reasons are copied into the customer
view and approval/rejection uses the existing notification deduplication.

## Consequences

The account review area and order detail links can be driven by purchase
history without trusting browser-supplied order relationships. Review
aggregates are computed from approved rows, while admin moderation uses the
existing RBAC system (`reviews.view` and `reviews.moderate`). Gifts,
undelivered orders, and fully returned quantities never produce a new review
eligibility. Historical review linkage remains stable if an order is later
returned.
