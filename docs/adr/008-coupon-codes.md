# ADR 008: Coupon Codes and Usage Management

## Decision

Customer-entered coupons remain separate from Product `price`/`compareAtPrice` and automatic Promotions. A cart stores only the selected `couponId`; every cart read and checkout recalculates the result from current product prices and the current coupon rules.

Only one coupon can be applied to an order. A non-combinable coupon competes with the best automatic promotion, while a combinable coupon is evaluated against the remaining paid merchandise subtotal. BOGO gifts remain free and are not part of the coupon base.

## History and limits

Successful orders create both an immutable `OrderCoupon` snapshot and one `CouponRedemption`. Cart applications consume no usage. The coupon row is locked during order creation before usage counts are checked, so total and per-customer limits are protected by PostgreSQL transaction serialization. Cancellation reverses the redemption idempotently; a post-delivery return does not.

Used coupons cannot be hard-deleted or have their code changed. Future rules can be edited only when they do not invalidate existing usage, such as lowering a total limit below current redemptions.

## Single-store scope

This template targets one independent ecommerce store. Coupons are not scoped to tenants, stores, products, categories, segments, or marketing campaigns.
