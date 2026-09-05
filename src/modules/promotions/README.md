# Promotions Module

The Promotions module manages commercial offers, threshold-based spend discounts, and Buy X Get Y Free promotions.

## Core Responsibilities
- **Promotion Lifecycle**: Manages active, scheduled, expired, and inactive states derived from start/end dates and flags.
- **Central Evaluator**: Single authoritative evaluation engine for calculating customer savings, free gift allocation, and stock validation across Cart, Checkout, and Order Placement.
- **Storefront Merchandising**: Powers homepage hero campaigns (slider/carousel with fallback), `/offers` catalog, and `/offers/[slug]` detail pages.
- **Order Snapshots**: Records immutable `OrderPromotion` snapshot records and `OrderItem` gift items.
- **Store Settings Integration**: Enforces maximum enabled offers and maximum hero campaigns limits.
