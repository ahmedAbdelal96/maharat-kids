# Verified purchase reviews

Reviews belong to the customer who purchased a product and to the exact paid,
delivered `OrderItem` that qualified the submission. Gift items and products
whose purchased quantity has been physically returned are not eligible.

Customers can create one review per product and edit only its rating/comment.
Edits return moderation to `PENDING`. Public pages read approved reviews only;
administrators use the existing permission system with `reviews.view` and
`reviews.moderate`.
