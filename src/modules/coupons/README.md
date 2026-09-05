# Coupons

Coupons are explicit customer-entered codes. They remain separate from product pricing and automatic Promotions. Cart applications are recalculated on every read; only a successful order creates a `CouponRedemption` and immutable `OrderCoupon` snapshot.

Only one coupon is stored on a cart. Guest intent is retained when the guest cart is merged into a customer cart and is revalidated against the customer usage limit. Used coupons are never hard-deleted.
