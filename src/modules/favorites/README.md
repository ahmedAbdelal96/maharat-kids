# Favorites module

Favorites are a single private collection owned by each authenticated CUSTOMER.
The browser sends only a product ID. The current customer comes from the server
session, and the service verifies that the product is ACTIVE before saving it.

The composite database constraint makes repeated saves idempotent. Product
deletion cascades the relation, while archived or out-of-stock products remain
visible in the customer's collection as unavailable until removed.
